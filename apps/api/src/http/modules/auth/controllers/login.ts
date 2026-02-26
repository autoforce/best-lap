import { FastifyReply, FastifyRequest } from 'fastify'
import { loginBodySchema } from '../schemas/login'
import { TypeormUsersRepository } from '@best-lap/infra'
import { AuthenticateUserUseCase, InvalidCredentials } from '@best-lap/core'
import { generateToken } from '../../../../lib/jwt'

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = loginBodySchema.parse(request.body)

    const usersRepository = new TypeormUsersRepository()
    const authenticateUserUseCase = new AuthenticateUserUseCase(usersRepository)

    const { user } = await authenticateUserUseCase.execute({ email, password })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    })

    return reply.code(200).send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof InvalidCredentials) {
      return reply.status(401).send({ message: error.message })
    }

    // Temporary: return detailed error for debugging
    return reply.code(500).send({
      error: 'Internal Server Error.',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
