import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { triggerSync } from './controllers/trigger-sync'
import { importChannels } from './controllers/import-channels'
import { triggerSyncDocs } from './docs/trigger-sync-docs'
import { importChannelsDocs } from './docs/import-channels-docs'

export async function syncRoutes(server: FastifyInstance) {
  const app = server.withTypeProvider<ZodTypeProvider>()

  /**
   * POST /sync/channels - Manually trigger channel synchronization from Autoforce API
   */
  app.post('/channels', { schema: triggerSyncDocs }, triggerSync)

  /**
   * POST /sync/channels/import - Import channels directly from request body
   */
  app.post('/channels/import', { schema: importChannelsDocs }, importChannels)
}
