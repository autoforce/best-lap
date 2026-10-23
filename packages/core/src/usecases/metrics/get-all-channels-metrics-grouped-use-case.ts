import { endOfUtcDay, startOfUtcDay } from "../../utils";
import { PerformanceMetricEnum } from "../../types";
import { MetricsRepository } from "../../modules";
import { metricsSource } from "./metrics-sql";

type GetMetricsGroupedByChannelParams = {
  period: 'hourly' | 'daily' | 'weekly'
  startDate?: string
  endDate?: string
}

interface GetAllChannelsMetricsGroupedUseCaseRequest {
  metric?: PerformanceMetricEnum
  filterPeriodOptions: GetMetricsGroupedByChannelParams
}

export interface ChannelMetricsGrouped {
  channel_id: string
  channel_name: string
  period_start: Date
  avg_score: number
  avg_response_time: number
  avg_fcp: number
  avg_si: number
  avg_lcp: number
  avg_tbt: number
  avg_cls: number
  avg_seo: number
}

export class GetAllChannelsMetricsGroupedUseCase {
  constructor(
    private metricsRepository: MetricsRepository
  ) { }

  async execute({ filterPeriodOptions }: GetAllChannelsMetricsGroupedUseCaseRequest): Promise<ChannelMetricsGrouped[]> {
    const metricsGroupedByChannel = await this._getMetricsGroupedByChannel(filterPeriodOptions)
    return metricsGroupedByChannel
  }

  async _getMetricsGroupedByChannel({
    period,
    startDate = '2000-01-01',
    endDate,
  }: GetMetricsGroupedByChannelParams): Promise<ChannelMetricsGrouped[]> {
    if (!period) throw new Error('Period is required');

    const parsedStartDate = startOfUtcDay(startDate);
    const parsedEndDate = endDate ? endOfUtcDay(endDate) : new Date();
    const source = metricsSource(period);

    const results = await this.metricsRepository.query(
      `
      SELECT
        c.id AS channel_id,
        c.name AS channel_name,
        ${source.periodStart} AS period_start,
        ${source.averages}
      FROM ${source.table} m
      INNER JOIN pages p ON m.page_id = p.id
      INNER JOIN channels c ON p.channel_id = c.id
      WHERE ${source.timeColumn} BETWEEN $1 AND $2
        AND p.path = '/'
        AND c.active = true
      GROUP BY c.id, c.name, ${source.periodStart}
      ORDER BY c.id, period_start;
      `,
      [parsedStartDate, parsedEndDate]
    );

    return results as ChannelMetricsGrouped[];
  }
}
