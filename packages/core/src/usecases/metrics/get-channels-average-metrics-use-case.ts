import { PerformanceAverageMetricsResponse, PerformanceMetricEnum } from "../../types";
import { MetricsRepository } from "../../modules";
import { metricsSource } from "./metrics-sql";
import { endOfUtcDay, filterByAverageMetric, startOfUtcDay } from "../../utils";

type GetMetricsAverageParams = {
  period: 'hourly' | 'daily' | 'weekly'
  startDate?: string
  endDate?: string
  theme?: string
  pagePath?: string
  providerId?: string
}

interface GetChannelsAverageMetricsUseCaseRequest {
  metric?: PerformanceMetricEnum
  filterPeriodOptions: GetMetricsAverageParams
}

export class GetChannelsAverageMetricsUseCase {
  constructor(
    private metricsRepository: MetricsRepository
  ) { }

  async execute({ metric, filterPeriodOptions }: GetChannelsAverageMetricsUseCaseRequest) {
    const metricsAverage = await this._getMetricsByPeriod(filterPeriodOptions)

    const allMetricsResponseData = metricsAverage as PerformanceAverageMetricsResponse[]

    if (!metric) return allMetricsResponseData

    const filteredMetricsData = filterByAverageMetric(metric, allMetricsResponseData)

    return filteredMetricsData
  }

  async _getMetricsByPeriod({
    period,
    startDate = '2000-01-01',
    endDate,
    theme,
    pagePath,
    providerId,
  }: GetMetricsAverageParams) {
    if (!period) return null;

    const parsedStartDate = startOfUtcDay(startDate);
    const parsedEndDate = endDate ? endOfUtcDay(endDate) : new Date();
    const source = metricsSource(period);

    // Same universe as the grouped endpoint: only active channels count towards averages
    const whereConditions = [`${source.timeColumn} BETWEEN $1 AND $2`, 'c.active = true'];
    const queryParams: unknown[] = [parsedStartDate, parsedEndDate];

    if (pagePath) {
      whereConditions.push(`p.path = $${queryParams.length + 1}`);
      queryParams.push(pagePath);
    }

    if (theme) {
      whereConditions.push(`c.theme = $${queryParams.length + 1}`);
      queryParams.push(theme);
    }

    if (providerId) {
      whereConditions.push(`c.provider_id = $${queryParams.length + 1}`);
      queryParams.push(providerId);
    }

    const results = await this.metricsRepository.query(
      `
      SELECT
        ${source.periodStart} AS period_start,
        ${source.averages}
      FROM ${source.table} m
      INNER JOIN pages p ON m.page_id = p.id
      INNER JOIN channels c ON p.channel_id = c.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY ${source.periodStart}
      ORDER BY period_start;
      `,
      queryParams
    );

    return results;
  }
}
