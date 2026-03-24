import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { triggerSync } from './controllers/trigger-sync'
import { importChannels } from './controllers/import-channels'
import { addChannels } from './controllers/add-channels'
import { triggerSyncDocs } from './docs/trigger-sync-docs'
import { importChannelsDocs } from './docs/import-channels-docs'
import { addChannelsDocs } from './docs/add-channels-docs'

export async function syncRoutes(server: FastifyInstance) {
  const app = server.withTypeProvider<ZodTypeProvider>()

  app.post('/channels', { schema: triggerSyncDocs }, triggerSync)

  app.post('/channels/import', { schema: importChannelsDocs }, importChannels)

  app.post('/channels/add', { schema: addChannelsDocs }, addChannels)
}
