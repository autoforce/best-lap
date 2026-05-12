import { CollectPageMetricsJobParams, PageMetricsQueue } from "@best-lap/core";
import { Queue } from "bullmq";

export class BullMqPageMetricsQueue implements PageMetricsQueue {
  constructor(
    private queuesMap: {
      [key: string]: Queue;
    }
  ) { }

  async setCollectPageMetricsJob({ type, data }: CollectPageMetricsJobParams): Promise<void> {
    const queue = this.queuesMap[type];
    if (!queue) {
      throw new Error(`Queue for type "${type}" not found`);
    }

    const { pageId, pageUrl } = data;
    const dateTimestamp = new Date().toISOString();

    await queue.add(
      'collectChannelPerformanceMetric',
      { pageUrl, pageId },
      {
        jobId: `collect-metrics-${pageId}-${dateTimestamp}`,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      }
    )
  }
} 