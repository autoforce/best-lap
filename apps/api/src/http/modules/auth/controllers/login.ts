import { FastifyReply, FastifyRequest } from 'fastify'
import { loginBodySchema } from '../schemas/login'
import { TypeormUsersRepository } from '@best-lap/infra'
import { AuthenticateUserUseCase, InvalidCredentials } from '@best-lap/core'
import { generateToken } from '../../../../lib/jwt'
import { clearFailures, registerFailure, retryAfterSeconds } from '../../../../lib/login-attempts'

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = loginBodySchema.parse(request.body)

  const wait = retryAfterSeconds(request.ip, email)
  if (wait > 0) {
    return reply
      .status(429)
      .header('Retry-After', String(wait))
      .send({ message: `Muitas tentativas. Tente novamente em ${Math.ceil(wait / 60)} minuto(s).` })
  }

  try {
    const usersRepository = new TypeormUsersRepository()
    const authenticateUserUseCase = new AuthenticateUserUseCase(usersRepository)

    const { user } = await authenticateUserUseCase.execute({ email, password })
    clearFailures(request.ip, email)

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
    if (error instanceof InvalidCredentials) {
      registerFailure(request.ip, email)
      return reply.status(401).send({ message: error.message })
    }

    request.log.error(error, 'Login failed')
    return reply.code(500).send({ error: 'Internal Server Error.' })
  }
}
