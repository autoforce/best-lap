import { FastifyReply, FastifyRequest } from "fastify";
import { triggerCollectionPageParamsSchema } from "../utils/trigger-collection-schemas";
import { enqueueCollection } from "./enqueue-collection";

export async function triggerCollectionPage(request: FastifyRequest, reply: FastifyReply) {
  const { channel_id, page_id } = triggerCollectionPageParamsSchema.parse(request.params);
  return enqueueCollection(request, reply, { kind: 'page', channelId: channel_id, pageId: page_id }, 'all');
}
