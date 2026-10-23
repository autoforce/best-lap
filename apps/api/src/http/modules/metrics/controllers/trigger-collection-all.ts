import { FastifyReply, FastifyRequest } from "fastify";
import { enqueueCollection } from "./enqueue-collection";

// Manual "collect everything" measures only home pages, to spare the PageSpeed Insights quota;
// the scheduled collection measures every page.
export async function triggerCollectionAll(request: FastifyRequest, reply: FastifyReply) {
  return enqueueCollection(request, reply, { kind: 'all' }, 'home');
}
