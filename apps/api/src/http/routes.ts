import { FastifyInstance } from "fastify"
import { dataSource, queuesMap } from "@best-lap/infra"
import { channelsRoutes } from "./modules/channels/routes"
import { metricsRoutes } from "./modules/metrics/routes"
import { pagesRoutes } from "./modules/pages/routes"
import { providersRoutes } from "./modules/providers/routes"
import { authRoutes } from "./modules/auth/routes"
import { usersRoutes } from "./modules/users/routes"
import { syncRoutes } from "./modules/sync/routes"
import { insightsRoutes } from "./modules/insights/routes"

export async function appRoutes(server: FastifyInstance) {
  // Health check: 503 only when the database is down; Redis problems are reported but do not
  // make the platform restart the API, since reads keep working without the queue
  server.get('/health', async (_request, reply) => {
    const check = async (fn: () => Promise<unknown>) => {
      try {
        await Promise.race([fn(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))])
        return 'ok'
      } catch {
        return 'down'
      }
    }

    const [database, redis] = await Promise.all([
      check(() => dataSource.query('SELECT 1')),
      check(async () => (await queuesMap.reference.client).ping()),
    ])

    return reply.code(database === 'ok' ? 200 : 503).send({
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      redis,
      timestamp: new Date().toISOString(),
    })
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

  server.register(syncRoutes, {
    prefix: 'sync',
  })

  server.register(insightsRoutes, {
    prefix: 'insights',
  })
}