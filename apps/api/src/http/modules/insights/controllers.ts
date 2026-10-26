import { FastifyReply, FastifyRequest } from 'fastify'
import {
  GetAttentionItemsUseCase,
  GetChannelInsightsUseCase,
  GetChannelPagesMetricsUseCase,
  GetCommonOpportunitiesUseCase,
  GetGroupDiagnosisUseCase,
  GetPageDiagnosisUseCase,
} from '@best-lap/core'
import { TypeormMetricsRepository, TypeormPageInsightsRepository, TypeormPageSnapshotsRepository } from '@best-lap/infra'

export async function listAttentionItems(request: FastifyRequest, reply: FastifyReply) {
  const { provider_id } = request.query as { provider_id?: string }
  const result = await new GetAttentionItemsUseCase(new TypeormMetricsRepository()).execute({ providerId: provider_id })
  return reply.code(200).send(result)
}

export async function listCommonOpportunities(request: FastifyRequest, reply: FastifyReply) {
  const { theme, provider_id } = request.query as { theme?: string; provider_id?: string }
  const result = await new GetCommonOpportunitiesUseCase(new TypeormPageInsightsRepository()).execute({
    theme,
    providerId: provider_id,
  })
  return reply.code(200).send(result)
}

export async function listChannelInsights(request: FastifyRequest, reply: FastifyReply) {
  const { channel_id } = request.params as { channel_id: string }
  const result = await new GetChannelInsightsUseCase(new TypeormPageInsightsRepository()).execute(channel_id)
  return reply.code(200).send(result)
}

export async function listChannelPagesMetrics(request: FastifyRequest, reply: FastifyReply) {
  const { channel_id, period } = request.params as { channel_id: string; period: 'hourly' | 'daily' | 'weekly' }
  const { startDate, endDate } = request.query as { startDate?: string; endDate?: string }
  const metrics = await new GetChannelPagesMetricsUseCase(new TypeormMetricsRepository()).execute({
    channelId: channel_id,
    period,
    startDate,
    endDate,
  })
  return reply.code(200).send({ metrics })
}

export async function getPageDiagnosis(request: FastifyRequest, reply: FastifyReply) {
  const { page_id } = request.params as { page_id: string }
  const result = await new GetPageDiagnosisUseCase(new TypeormPageSnapshotsRepository()).execute(page_id)
  return reply.code(200).send(result)
}

export async function getGroupDiagnosis(request: FastifyRequest, reply: FastifyReply) {
  const { theme, provider_id } = request.query as { theme?: string; provider_id?: string }
  const result = await new GetGroupDiagnosisUseCase(new TypeormPageSnapshotsRepository()).execute({
    theme,
    providerId: provider_id,
  })
  return reply.code(200).send(result)
}
