import 'reflect-metadata';
import Fastify, { FastifyError } from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { env, requireApiEnv } from '@best-lap/env'

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyHelmet from '@fastify/helmet';
import { appRoutes } from './http/routes';
import { swaggerConfig } from './docs/config';
import { authMiddleware } from './http/middlewares/auth';

import { connectToDatabase } from '@best-lap/infra';
import { loggerConfig } from './config';

// Routes that answer without a user session. /sync/* uses its own x-api-key check.
const PUBLIC_PATHS = ['/health', '/auth/login']
const PUBLIC_PREFIXES = ['/docs', '/sync/']

function isPublic(url: string) {
  const path = url.split('?')[0]
  return PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))
}

async function startServer() {
  try {
    requireApiEnv();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  try {
    // The API owns migrations; the collector never runs them, so they cannot race on deploy
    await connectToDatabase({ runMigrations: true });
  } catch (error) {
    console.error('Erro ao conectar com banco:', error);
    process.exit(1);
  }

  const server = Fastify({
    logger: loggerConfig,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true
      }
    }
  }).withTypeProvider<ZodTypeProvider>();

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // JSON API: the CSP header only matters for the Swagger UI, which needs inline scripts
  server.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  server.register(fastifySwagger, swaggerConfig);
  server.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    }
  });

  const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  server.register(import('@fastify/cors'), {
    origin: corsOrigins.includes('*') ? '*' : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    // Auth travels in the Authorization header, never in cookies
    credentials: false,
  });

  // Every route requires a signed-in user unless listed as public
  server.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS' || isPublic(request.url)) return
    return authMiddleware(request, reply)
  });

  server.setErrorHandler((error: FastifyError, request, reply) => {
    // `details` is part of some 400 schemas; extra keys are stripped by the others
    if (error instanceof ZodError || error.validation || error.code === 'FST_ERR_VALIDATION') {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
        details: error instanceof ZodError ? error.issues : [],
      })
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: error.name, message: error.message, details: [] })
    }

    request.log.error(error)
    return reply.status(500).send({ error: 'Internal Server Error', message: 'Unexpected error' })
  });

  server.register(appRoutes);

  server.listen({ port: env.API_PORT, host: '0.0.0.0' })
    .then(() => {
      console.log(`Application is running at port ${env.API_PORT}! 🚀`);
    })
    .catch((err) => {
      server.log.error(err);
      process.exit(1);
    });

  // Finish in-flight requests and close connections when the platform stops the container
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, async () => {
      server.log.info({ signal }, 'Shutting down');
      await server.close();
      process.exit(0);
    });
  }
}

startServer();
