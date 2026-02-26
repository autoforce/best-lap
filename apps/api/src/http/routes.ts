import { FastifyInstance } from "fastify"
import { channelsRoutes } from "./modules/channels/routes"
import { metricsRoutes } from "./modules/metrics/routes"
import { pagesRoutes } from "./modules/pages/routes"
import { providersRoutes } from "./modules/providers/routes"
import { authRoutes } from "./modules/auth/routes"
import { usersRoutes } from "./modules/users/routes"

export async function appRoutes(server: FastifyInstance) {
  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Auth routes
  server.register(authRoutes, {
    prefix: 'auth',
  })

  // User management routes
  server.register(usersRoutes)

  server.register(channelsRoutes, {
    prefix: 'channels',
  })

  server.register(pagesRoutes, {
    prefix: 'channels',
  })

  server.register(metricsRoutes, {
    prefix: 'channels/metrics',
  })

  server.register(providersRoutes, {
    prefix: 'providers',
  })
}