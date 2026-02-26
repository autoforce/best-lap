import { FastifyReply, FastifyRequest } from 'fastify'
import { createUserBodySchema } from '../schemas/create'
import { TypeormUsersRepository } from '@best-lap/infra'
import { CreateUserUseCase, UserAlreadyExists } from '@best-lap/core'

export async function createUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { name, email, password } = createUserBodySchema.parse(request.body)

    const usersRepository = new TypeormUsersRepository()
    const createUserUseCase = new CreateUserUseCase(usersRepository)

    const user = await createUserUseCase.execute({ name, email, password })

    return reply.code(201).send({ user })
  } catch (error) {
    console.error(error)

    if (error instanceof UserAlreadyExists) {
      return reply.status(409).send({ message: error.message })
    }

    return reply.code(500).send({ error: 'Internal Server Error.' })
  }
}
