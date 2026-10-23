import { FastifyReply, FastifyRequest } from "fastify";
import { ChannelNotCollectable, CollectionScope, EnqueueCollectionUseCase, ResourceNotFound } from "@best-lap/core";
import { TypeormChannelsRepository, BullMqPageMetricsQueue, queuesMap } from "@best-lap/infra";

// One minute window: a double click or a retried request does not enqueue the same pages twice
const manualBatchKey = () => `manual_${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')}`

/** Shared handler for the three "collect now" routes */
export async function enqueueCollection(
  request: FastifyRequest,
  reply: FastifyReply,
  scope: CollectionScope,
  pages: 'all' | 'home',
) {
  try {
    const useCase = new EnqueueCollectionUseCase(new TypeormChannelsRepository(), new BullMqPageMetricsQueue(queuesMap))
    const result = await useCase.execute({ scope, pages, batchKey: manualBatchKey() })

    request.log.info({ scope, pages, jobs: result.jobs_count, skipped: result.skipped.length }, 'Manual collection enqueued')

    const target = scope.kind === 'all' ? `${result.channels_count} channels` : scope.kind === 'channel' ? 'channel' : 'page'
    return reply.code(200).send({
      message: `Successfully enqueued ${result.jobs_count} metrics collection jobs for ${target}`,
      jobs_count: result.jobs_count,
      ...(scope.kind !== 'all' && { channel_id: scope.channelId }),
      ...(scope.kind === 'page' && { page_id: scope.pageId }),
    });
  } catch (error) {
    if (error instanceof ResourceNotFound) {
      return reply.code(404).send({ message: 'Channel not found' });
    }
    if (error instanceof ChannelNotCollectable) {
      return reply.code(400).send({ message: error.message });
    }
    request.log.error(error, 'Error enqueueing collection');
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}
