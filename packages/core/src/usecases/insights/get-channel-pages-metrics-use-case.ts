import type { MetricsRepository } from '../../modules/metric/metrics-repository.interface'
import { endOfUtcDay, startOfUtcDay } from '../../utils'
import { metricsSource, type MetricsPeriod } from '../metrics/metrics-sql'

export interface PageMetricsGrouped {
  page_id: string
  page_name: string
  page_path: string
  period_start: Date
  avg_score: number
  avg_seo: number
  avg_response_time: number | string
  avg_fcp: number
  avg_si: number
  avg_lcp: number
  avg_tbt: number
  avg_cls: number
}

/** Every page of one channel, grouped by period: powers the per-page view of a channel */
export class GetChannelPagesMetricsUseCase {
  constructor(private metricsRepository: MetricsRepository) {}

  async execute({
    channelId,
    period,
    startDate = '2000-01-01',
    endDate,
  }: {
    channelId: string
    period: MetricsPeriod
    startDate?: string
    endDate?: string
  }): Promise<PageMetricsGrouped[]> {
    const source = metricsSource(period)

    const rows = await this.metricsRepository.query(
      `
      SELECT
        p.id AS page_id,
        p.name AS page_name,
        p.path AS page_path,
        ${source.periodStart} AS period_start,
        ${source.averages}
      FROM ${source.table} m
      INNER JOIN pages p ON m.page_id = p.id
      WHERE p.channel_id = $1
        AND ${source.timeColumn} BETWEEN $2 AND $3
      GROUP BY p.id, p.name, p.path, ${source.periodStart}
      ORDER BY p.path, period_start;
      `,
      [channelId, startOfUtcDay(startDate), endDate ? endOfUtcDay(endDate) : new Date()]
    )

    return rows as PageMetricsGrouped[]
  }
}
