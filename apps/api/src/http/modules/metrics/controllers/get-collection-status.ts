import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "@best-lap/env";
import { TypeormMetricsRepository, queuesMap } from "@best-lap/infra";
import { nextCronRun } from "../../../../lib/next-cron-run";

type JobCounts = { waiting: number; active: number; delayed: number; failed: number }
type CountableQueue = { getJobCounts: (...types: string[]) => Promise<Record<string, number>> }

async function getQueueCounts(): Promise<JobCounts | null> {
  try {
    const counts = await Promise.all(
      (Object.values(queuesMap) as CountableQueue[]).map((queue) =>
        queue.getJobCounts('waiting', 'active', 'delayed', 'failed')
      )
    )

    return counts.reduce<JobCounts>(
      (total, c) => ({
        waiting: total.waiting + (c.waiting ?? 0),
        active: total.active + (c.active ?? 0),
        delayed: total.delayed + (c.delayed ?? 0),
        failed: total.failed + (c.failed ?? 0),
      }),
      { waiting: 0, active: 0, delayed: 0, failed: 0 }
    )
  } catch {
    // Redis unavailable: the dashboard still shows the last collection time
    return null
  }
}

export async function getCollectionStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
    const metricsRepository = new TypeormMetricsRepository()
    const [rows, queue] = await Promise.all([
      metricsRepository.query('SELECT MAX(time) AS last_collected_at FROM metrics', []) as Promise<
        Array<{ last_collected_at: Date | null }>
      >,
      getQueueCounts(),
    ])

    const nextRun = nextCronRun(env.COLLECT_METRICS_CRON_EXPRESSION, new Date(), env.CRON_TIMEZONE)

    return reply.code(200).send({
      last_collected_at: rows[0]?.last_collected_at ?? null,
      next_run_at: nextRun,
      schedule: env.COLLECT_METRICS_CRON_EXPRESSION,
      strategy: 'mobile',
      queue,
    })
  } catch (error) {
    request.log.error(error, 'Failed to read collection status')

    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}
