import Fastify from 'fastify';
import { FastifyAdapter } from '@bull-board/fastify';
import { setupQueues } from './utils/setup-queues';
import { connection } from './utils/connection';
import { loggerConfig } from './config';
import { env } from '@best-lap/env';
import { timingSafeEqual } from 'node:crypto';

/** HTTP Basic auth with user "admin" and ADMIN_TOKEN as password */
function isAuthorized(header: string | undefined): boolean {
  if (!env.ADMIN_TOKEN || !header?.startsWith('Basic ')) return false
  const [user, ...rest] = Buffer.from(header.slice(6), 'base64').toString().split(':')
  const provided = Buffer.from(rest.join(':'))
  const expected = Buffer.from(env.ADMIN_TOKEN)
  return user === 'admin' && provided.length === expected.length && timingSafeEqual(provided, expected)
}

async function startAdminServer() {
  const fastify = Fastify({
    logger: loggerConfig
  });

  if (!env.ADMIN_TOKEN) {
    console.error('ADMIN_TOKEN is required: the panel can delete and retry jobs and must not be public.');
    process.exit(1);
  }

  // The panel can delete and retry jobs, so every page except /health requires the admin password
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return
    if (!isAuthorized(request.headers.authorization)) {
      return reply
        .status(401)
        .header('WWW-Authenticate', 'Basic realm="Best Lap Admin", charset="UTF-8"')
        .send('Autenticação necessária')
    }
  });

  const serverAdapter = new FastifyAdapter();

  await setupQueues(connection, serverAdapter);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  });

  await fastify.register(serverAdapter.registerPlugin(), {
    prefix: '/',
  });

  const PORT = env.ADMIN_PORT || 4000;

  fastify.listen({ port: PORT, host: '0.0.0.0' })
    .then(() => {
      console.log(`Bull Board Admin running on http://localhost:${PORT} 🚀`);
    })
    .catch((err) => {
      fastify.log.error(err);
      process.exit(1);
    });
}

startAdminServer().catch(err => {
  console.error('Error starting Bull Board Admin:', err);
  process.exit(1);
});
