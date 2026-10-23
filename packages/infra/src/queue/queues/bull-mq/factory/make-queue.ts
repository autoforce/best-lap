import { Queue } from 'bullmq'
import { redisOptions } from '../../../../redis/config';
import { QueueType } from '../../types/queue-type';

export const makeQueue = (queueName: QueueType): Queue => {
  return new Queue(queueName, {
    connection: redisOptions,
    defaultJobOptions: {
      // PageSpeed Insights fails transiently (timeouts, 429/500); retry with growing delays
      attempts: 3,
      backoff: { type: 'exponential', delay: 2 * 60 * 1000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 500 },
    },
  });
}
