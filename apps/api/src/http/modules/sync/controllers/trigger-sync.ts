import { FastifyReply, FastifyRequest } from 'fastify'
import { env } from '@best-lap/env'
import { AutoforceApiService, SyncChannelsUseCase } from '@best-lap/core'
import { TypeormChannelsRepository } from '@best-lap/infra/typeorm/repositories/typeorm-channels-repository'
import { TypeormPagesRepository } from '@best-lap/infra/typeorm/repositories/typeorm-pages-repository'

/**
 * Triggers a manual synchronization of channels from Autoforce API
 */
export async function triggerSync(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Check if sync is enabled
    if (!env.SYNC_CHANNELS_ENABLED) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Channel synchronization is disabled (SYNC_CHANNELS_ENABLED=false)',
      })
    }

    // Check if API credentials are configured
    if (!env.AUTOFORCE_API_URL || !env.AUTOFORCE_API_KEY) {
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Autoforce API credentials not configured',
      })
    }

    console.log('🔄 Manual sync triggered via API')

    // Initialize services
    const autoforceApiService = new AutoforceApiService({
      apiUrl: env.AUTOFORCE_API_URL,
      apiKey: env.AUTOFORCE_API_KEY,
    })

    const channelsRepository = new TypeormChannelsRepository()
    const pagesRepository = new TypeormPagesRepository()

    const syncChannelsUseCase = new SyncChannelsUseCase(
      channelsRepository,
      pagesRepository,
      autoforceApiService,
    )

    // Execute synchronization
    const result = await syncChannelsUseCase.execute()

    if (result.success) {
      return reply.status(200).send({
        message: 'Synchronization completed successfully',
        timestamp: result.timestamp,
        statistics: result.statistics,
        errors: result.errors || [],
      })
    } else {
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Synchronization failed',
        timestamp: result.timestamp,
        statistics: result.statistics,
        errors: result.errors || [],
      })
    }
  } catch (error) {
    console.error('❌ Sync API endpoint error:', error)
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error during synchronization',
    })
  }
}
