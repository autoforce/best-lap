export interface CollectPageMetricsJobParams {
  type: 'client' | 'reference';
  data: CollectPageMetricsJobData;
}

type CollectPageMetricsJobData = {
  pageUrl: string
  pageId: string
}

export interface CollectPageMetricsJob {
  type: 'client' | 'reference'
  pageId: string
  pageUrl: string
}

export type PageMetricsQueue = {
  setCollectPageMetricsJob: (job: CollectPageMetricsJobParams) => Promise<void>;
  /**
   * Enqueues many jobs at once. Jobs with the same page and `batchKey` are deduplicated,
   * so a cron firing twice (two instances) or a double click never collects a page twice.
   * Returns how many jobs were sent to the queue.
   */
  enqueueCollectJobs: (jobs: CollectPageMetricsJob[], batchKey: string) => Promise<number>;
}
