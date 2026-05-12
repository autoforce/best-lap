import { Queue } from 'bullmq'
import { redisOptions } from '../../../../redis/config';
import { QueueType } from '../../types/queue-type';

export const makeQueue = (queueName: QueueType): Queue => {
  return new Queue(queueName, {
    connection: redisOptions,
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}
