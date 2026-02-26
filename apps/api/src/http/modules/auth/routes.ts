import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { login, me } from './controllers'
import { loginDocs, meDocs } from './docs'
import { authMiddleware } from '../../middlewares/auth'

export async function authRoutes(server: FastifyInstance) {
  server.withTypeProvider<ZodTypeProvider>().post('/login', loginDocs, login)

  server
    .withTypeProvider<ZodTypeProvider>()
    .get('/me', { preHandler: [authMiddleware], ...meDocs }, me)
}
