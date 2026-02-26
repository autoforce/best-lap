import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../../lib/jwt'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string
      email: string
      name: string
    }
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      return reply.status(401).send({ message: 'No token provided' })
    }

    const [, token] = authHeader.split(' ')

    if (!token) {
      return reply.status(401).send({ message: 'Invalid token format' })
    }

    const decoded = verifyToken(token)
    request.user = decoded
  } catch (error) {
    return reply.status(401).send({ message: 'Invalid or expired token' })
  }
}
