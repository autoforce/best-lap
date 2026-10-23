import { timingSafeEqual } from 'node:crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '@best-lap/env'

/**
 * Protects machine-to-machine sync routes (e.g. Make scenarios).
 * Expects the key in the `x-api-key` header.
 */
export async function syncApiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!env.SYNC_API_KEY) {
    return reply.status(503).send({
      error: 'Service Unavailable',
      message: 'SYNC_API_KEY is not configured on the server',
    })
  }

  const header = request.headers['x-api-key']
  const provided = Buffer.from(typeof header === 'string' ? header : '')
  const expected = Buffer.from(env.SYNC_API_KEY)

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid x-api-key header',
    })
  }
}
