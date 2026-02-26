import { FastifyReply, FastifyRequest } from 'fastify'
import { deleteUserParamsSchema } from '../schemas/delete'
import { TypeormUsersRepository } from '@best-lap/infra'
import { DeleteUserUseCase, ResourceNotFound } from '@best-lap/core'

export async function deleteUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { user_id } = deleteUserParamsSchema.parse(request.params)

    const usersRepository = new TypeormUsersRepository()
    const deleteUserUseCase = new DeleteUserUseCase(usersRepository)

    await deleteUserUseCase.execute(user_id)

    return reply.code(204).send()
  } catch (error) {
    console.error(error)

    if (error instanceof ResourceNotFound) {
      return reply.status(404).send({ message: error.message })
    }

    return reply.code(500).send({ error: 'Internal Server Error.' })
  }
}
