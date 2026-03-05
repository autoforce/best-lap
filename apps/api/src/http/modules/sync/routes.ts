import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { triggerSync } from './controllers/trigger-sync'
import { triggerSyncDocs } from './docs/trigger-sync-docs'

export async function syncRoutes(server: FastifyInstance) {
  const app = server.withTypeProvider<ZodTypeProvider>()

  /**
   * POST /sync/channels - Manually trigger channel synchronization
   */
  app.post('/channels', { schema: triggerSyncDocs }, triggerSync)
}
