import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { LOGO_DATA_URI } from "./brand";

const KNOWN_QUEUES = ["reference", "client"];

export async function setupQueues(connection: Redis, serverAdapter: FastifyAdapter) {
  try {
    // Known queues always show up, even before their first job; others are discovered in Redis
    const keys = await connection.keys('bull:*:meta');
    const queueNames = [...KNOWN_QUEUES, ...keys.map(key => key.split(':')[1])]
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
  } catch (error) {
    console.error('Error setting up queues:', error);
    return [];
  }
}