import { env } from "@best-lap/env";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const swaggerConfig = {
  openapi: {
    info: {
      title: 'Best Lap',
      description: 'API for collecting and analyzing performance metrics',
      version: '1.0.0',
      contact: {
        name: 'Autoforce',
        email: 'desenvolvimento@autoforce.com.br'
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http' as const, scheme: 'bearer', bearerFormat: 'JWT' },
        syncApiKey: { type: 'apiKey' as const, in: 'header', name: 'x-api-key' },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'users',
        description: 'User management endpoints'
      },
      {
        name: 'channels',
        description: 'Channel management endpoints'
      },
      {
        name: 'pages',
        description: 'Page management endpoints'
      },
      {
        name: 'metrics',
        description: 'Metrics collection and analysis endpoints'
      },
      {
        name: 'providers',
        description: 'Provider management endpoints'
      },
      {
        name: 'sync',
        description: 'Machine-to-machine channel synchronization (x-api-key)'
      },
      {
        name: 'insights',
        description: 'Attention items, opportunities and per-page metrics'
      }
    ],
    servers: [
      {
        url: '/',
        description: 'Este servidor'
      },
      {
        url: `http://localhost:${env.API_PORT}`,
        description: 'Desenvolvimento local'
      },
    ],
  },
  transform: jsonSchemaTransform,
}
  