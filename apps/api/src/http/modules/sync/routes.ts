import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { triggerSync } from './controllers/trigger-sync'
import { importChannels } from './controllers/import-channels'
import { addChannels } from './controllers/add-channels'
import { bulkChannels } from './controllers/bulk-channels'
import { triggerSyncDocs } from './docs/trigger-sync-docs'
import { importChannelsDocs } from './docs/import-channels-docs'
import { addChannelsDocs } from './docs/add-channels-docs'
import { bulkChannelsDocs } from './docs/bulk-channels-docs'
import { syncApiKeyMiddleware } from '../../middlewares/sync-api-key'

export async function syncRoutes(server: FastifyInstance) {
  const app = server.withTypeProvider<ZodTypeProvider>()

  // Every sync route is machine-to-machine and requires the x-api-key header.
  // onRequest runs before body validation, so unauthenticated calls never see schema details.
  app.addHook('onRequest', syncApiKeyMiddleware)

  app.post('/channels', { schema: triggerSyncDocs }, triggerSync)

  app.post('/channels/import', { schema: importChannelsDocs }, importChannels)

  app.post('/channels/add', { schema: addChannelsDocs }, addChannels)

  app.post(
    '/channels/bulk',
    {
      schema: bulkChannelsDocs,
      bodyLimit: 10 * 1024 * 1024,
    },
    bulkChannels
  )
}
