import { FastifyReply, FastifyRequest } from "fastify";
import { triggerCollectionParamsSchema } from "../utils/trigger-collection-schemas";
import { enqueueCollection } from "./enqueue-collection";

export async function triggerCollectionChannel(request: FastifyRequest, reply: FastifyReply) {
  const { channel_id } = triggerCollectionParamsSchema.parse(request.params);
  return enqueueCollection(request, reply, { kind: 'channel', channelId: channel_id }, 'all');
}
