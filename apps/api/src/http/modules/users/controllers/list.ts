import { FastifyReply, FastifyRequest } from 'fastify'
import { TypeormUsersRepository } from '@best-lap/infra'
import { ListUsersUseCase } from '@best-lap/core'

export async function listUsers(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const usersRepository = new TypeormUsersRepository()
    const listUsersUseCase = new ListUsersUseCase(usersRepository)

    const users = await listUsersUseCase.execute()

    return reply.code(200).send({ users })
  } catch (error) {
    console.error(error)
    return reply.code(500).send({ error: 'Internal Server Error.' })
  }
}
