import { CollectPageMetricsJob, CollectPageMetricsJobParams, PageMetricsQueue } from "@best-lap/core";
import { Queue } from "bullmq";

const JOB_NAME = 'collectChannelPerformanceMetric'

// BullMQ keys use ":" as separator, so ids only keep safe characters
const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_')

export class BullMqPageMetricsQueue implements PageMetricsQueue {
  constructor(
    private queuesMap: {
      [key: string]: Queue;
    }
  ) { }

  async setCollectPageMetricsJob({ type, data }: CollectPageMetricsJobParams): Promise<void> {
    await this.enqueueCollectJobs([{ type, pageId: data.pageId, pageUrl: data.pageUrl }], `single_${Date.now()}`)
  }

  async enqueueCollectJobs(jobs: CollectPageMetricsJob[], batchKey: string): Promise<number> {
    const byType = new Map<string, CollectPageMetricsJob[]>()
    for (const job of jobs) {
      const list = byType.get(job.type) ?? []
      list.push(job)
      byType.set(job.type, list)
    }

    let total = 0
    for (const [type, typeJobs] of byType) {
      const queue = this.queuesMap[type];
      if (!queue) {
        throw new Error(`Queue for type "${type}" not found`);
      }

      // Same page + same batch key = same job id, which BullMQ ignores while the job exists
      await queue.addBulk(
        typeJobs.map((job) => ({
          name: JOB_NAME,
          data: { pageUrl: job.pageUrl, pageId: job.pageId },
          opts: { jobId: safeId(`collect_${job.pageId}_${batchKey}`) },
        }))
      )
      total += typeJobs.length
    }

    return total
  }
}
