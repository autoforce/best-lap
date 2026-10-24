import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  attentionDocs,
  channelInsightsDocs,
  channelPagesMetricsDocs,
  groupDiagnosisDocs,
  opportunitiesDocs,
  pageDiagnosisDocs,
} from './docs'
import {
  getGroupDiagnosis,
  getPageDiagnosis,
  listAttentionItems,
  listChannelInsights,
  listChannelPagesMetrics,
  listCommonOpportunities,
} from './controllers'

// Errors are handled by the global error handler (logged, answered with 500)
export async function insightsRoutes(server: FastifyInstance) {
  const app = server.withTypeProvider<ZodTypeProvider>()

  app.get('/attention', attentionDocs, listAttentionItems)
  app.get('/opportunities', opportunitiesDocs, listCommonOpportunities)
  app.get('/channels/:channel_id', channelInsightsDocs, listChannelInsights)
  app.get('/channels/:channel_id/pages/:period', channelPagesMetricsDocs, listChannelPagesMetrics)
  app.get('/pages/:page_id/diagnosis', pageDiagnosisDocs, getPageDiagnosis)
  app.get('/diagnosis', groupDiagnosisDocs, getGroupDiagnosis)
}
