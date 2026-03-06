import { endOfDay, parseISO } from "date-fns";
import { PerformanceMetricEnum } from "../../types";
import { MetricsRepository } from "../../modules";

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

    const granularity = {
      hourly: 'hour',
      daily: 'day',
      weekly: 'week',
    }[period];

    if (!granularity) {
      throw new Error(`Invalid period: ${period}`);
    }

    const parsedStartDate = parseISO(startDate);
    const parsedEndDate = endDate ? endOfDay(parseISO(endDate)) : new Date();

    const sourceTable = {
      daily: 'metrics_daily',
      weekly: 'metrics_weekly',
      hourly: 'metrics',
    }[period];

    const timeColumn = period === 'hourly' ? 'time' : 'bucket';

    const colsMetricsTable = {
      score: 'score',
      response_time: '"response_time"',
      fcp: 'fcp',
      si: 'si',
      lcp: 'lcp',
      tbt: 'tbt',
      cls: 'cls',
      seo: 'seo',
    }

    const colsAvgMetricsTable = {
      score: 'avg_score',
      response_time: '"avg_response_time"',
      fcp: 'avg_fcp',
      si: 'avg_si',
      lcp: 'avg_lcp',
      tbt: 'avg_tbt',
      cls: 'avg_cls',
      seo: 'avg_seo',
    }

    const tableColsMap = sourceTable === 'metrics' ? colsMetricsTable : colsAvgMetricsTable;

    const results = await this.metricsRepository.query(
      `
      SELECT
        c.id AS channel_id,
        c.name AS channel_name,
        DATE_TRUNC('${granularity}', ${timeColumn}) AS period_start,
        AVG(${tableColsMap.score}) AS avg_score,
        AVG(${tableColsMap.response_time}) AS avg_response_time,
        AVG(${tableColsMap.fcp}) AS avg_fcp,
        AVG(${tableColsMap.si}) AS avg_si,
        AVG(${tableColsMap.lcp}) AS avg_lcp,
        AVG(${tableColsMap.tbt}) AS avg_tbt,
        AVG(${tableColsMap.cls}) AS avg_cls,
        AVG(${tableColsMap.seo}) AS avg_seo
      FROM ${sourceTable} m
      INNER JOIN pages p ON m.page_id = p.id
      INNER JOIN channels c ON p.channel_id = c.id
      WHERE ${timeColumn} BETWEEN $1 AND $2
        AND p.path = '/'
        AND c.active = true
      GROUP BY c.id, c.name, DATE_TRUNC('${granularity}', ${timeColumn})
      ORDER BY c.id, period_start;
      `,
      [parsedStartDate, parsedEndDate]
    );

    return results;
  }
}
