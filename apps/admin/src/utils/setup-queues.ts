import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { LOGO_DATA_URI } from "./brand";

const KNOWN_QUEUES = ["reference", "client"];

// ioredis has no command timeout: an unanswered KEYS would hold the server before it opens the port
const DISCOVERY_TIMEOUT_MS = 5000;

/** Names of the queues found in Redis; empty when Redis does not answer in time */
async function discoverQueueNames(connection: Redis): Promise<string[]> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer from Redis in ${DISCOVERY_TIMEOUT_MS} ms`)), DISCOVERY_TIMEOUT_MS);
  });

  try {
    const keys = await Promise.race([connection.keys('bull:*:meta'), timeout]);
    return keys.map(key => key.split(':')[1]);
  } catch (error) {
    console.warn(`Queue discovery failed (${error instanceof Error ? error.message : error}); showing the known queues only.`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function setupQueues(connection: Redis, serverAdapter: FastifyAdapter) {
  // Known queues always show up, even before their first job or when discovery fails
  const queueNames = [...KNOWN_QUEUES, ...(await discoverQueueNames(connection))]
    .filter((name, index, arr) => arr.indexOf(name) === index);

  console.log('Found queues:', queueNames);

  const queues = queueNames.map(name => {
    const queue = new Queue(name, { connection });
    return new BullMQAdapter(queue);
  });

  createBullBoard({
    queues,
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Best Lap · Filas',
        boardLogo: { path: LOGO_DATA_URI, width: 28, height: 28 },
        favIcon: { default: LOGO_DATA_URI, alternative: LOGO_DATA_URI },
        locale: { lng: 'pt-BR' },
      },
    },
  });

  return queues;
}
