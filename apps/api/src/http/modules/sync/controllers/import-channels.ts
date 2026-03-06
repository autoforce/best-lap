import { FastifyReply, FastifyRequest } from 'fastify'
import { SyncChannelsUseCase } from '@best-lap/core'
import { TypeormChannelsRepository, TypeormPagesRepository } from '@best-lap/infra'
import { z } from 'zod'

// Schema de validação para os dados de entrada
const importChannelsBodySchema = z.object({
  channels: z.array(
    z.object({
      name: z.string(),
      domain: z.string(),
      internal_link: z.string(),
      theme: z.string(),
      active: z.boolean().default(true),
      is_reference: z.boolean().optional(),
      provider_id: z.string().uuid().optional(),
      pages: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
            provider_id: z.string().uuid().optional(),
          })
        )
        .optional(),
    })
  ),
})

/**
 * Imports channels and pages directly from request body
 * Useful for initial data import or testing without external API
 */
export async function importChannels(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Parse and validate body
    const { channels } = importChannelsBodySchema.parse(request.body)

    console.log(`📥 Import triggered via API with ${channels.length} channels`)

    // Initialize repositories
    const channelsRepository = new TypeormChannelsRepository()
    const pagesRepository = new TypeormPagesRepository()

    // Create a mock API service that returns the provided data
    const mockApiService = {
      fetchChannels: async () => ({ channels }),
      testConnection: async () => true,
    }

    const syncChannelsUseCase = new SyncChannelsUseCase(
      channelsRepository,
      pagesRepository,
      mockApiService as any
    )

    // Execute synchronization with provided data
    const result = await syncChannelsUseCase.execute()

    if (result.success) {
      return reply.status(200).send({
        message: 'Import completed successfully',
        timestamp: result.timestamp,
        statistics: result.statistics,
        errors: result.errors || [],
      })
    } else {
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Import failed',
        timestamp: result.timestamp,
        statistics: result.statistics,
        errors: result.errors || [],
      })
    }
  } catch (error) {
    console.error('❌ Import API endpoint error:', error)

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid request body',
        details: error.errors,
      })
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error during import',
    })
  }
}
