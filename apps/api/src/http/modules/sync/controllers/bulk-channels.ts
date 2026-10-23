import { FastifyReply, FastifyRequest } from 'fastify'
import { BulkSyncRejected, BulkUpsertChannelsUseCase } from '@best-lap/core'
import { TypeormChannelsRepository, TypeormPagesRepository } from '@best-lap/infra'
import { bulkChannelsBodySchema } from '../schemas/bulk-channels'

/**
 * Receives the channel list of one source and brings local channels in line with it.
 * See BulkUpsertChannelsUseCase for the full/partial semantics.
 */
export async function bulkChannels(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { source, mode, dry_run, force, channels } = bulkChannelsBodySchema.parse(request.body)

    request.log.info(
      { source, mode, dry_run, force, channels: channels.length },
      'Bulk channels sync received'
    )

    const bulkUpsertChannelsUseCase = new BulkUpsertChannelsUseCase(
      new TypeormChannelsRepository(),
      new TypeormPagesRepository(),
    )

    const result = await bulkUpsertChannelsUseCase.execute({
      source,
      mode,
      channels,
      dryRun: dry_run,
      force,
    })

    request.log.info(
      { source, mode, dry_run, statistics: result.statistics, errors: result.errors.length },
      'Bulk channels sync finished'
    )

    return reply.status(200).send(result)
  } catch (error) {
    if (error instanceof BulkSyncRejected) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        message: error.message,
        details: error.details,
      })
    }

    request.log.error(error, 'Bulk channels sync failed')

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Bulk channels sync failed',
    })
  }
}
