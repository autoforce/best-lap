import { FastifyReply, FastifyRequest } from 'fastify'

export async function me(request: FastifyRequest, reply: FastifyReply) {
  return reply.code(200).send({ user: request.user })
}
