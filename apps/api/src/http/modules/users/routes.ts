import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { createUser, listUsers, deleteUser } from './controllers'
import { createUserDocs, listUsersDocs, deleteUserDocs } from './docs'
import { authMiddleware } from '../../middlewares/auth'

export async function usersRoutes(server: FastifyInstance) {
  // All user management routes require authentication
  server
    .withTypeProvider<ZodTypeProvider>()
    .get('/users', { preHandler: [authMiddleware], ...listUsersDocs }, listUsers)

  server
    .withTypeProvider<ZodTypeProvider>()
    .post('/users', { preHandler: [authMiddleware], ...createUserDocs }, createUser)

  server
    .withTypeProvider<ZodTypeProvider>()
    .delete(
      '/users/:user_id',
      { preHandler: [authMiddleware], ...deleteUserDocs },
      deleteUser
    )
}
