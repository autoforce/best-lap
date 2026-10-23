import { queuesMap } from './map';
import { makeCollectPageMetricsService } from '../../factories';
import { QueueType } from '@best-lap/infra';

type Job = {
  data: {
    pageUrl: string;
    pageId: string;
  };
};

const collectPageMetricsService = makeCollectPageMetricsService();

export const metricsWorkersConfig = Object.values(queuesMap).map((queue) => ({
  queueName: queue.name as QueueType,
  // Errors propagate on purpose: BullMQ retries the job and shows it as failed in the admin panel
  processor: async (job: Job) => {
    await collectPageMetricsService.execute(job.data);
  },
}));
