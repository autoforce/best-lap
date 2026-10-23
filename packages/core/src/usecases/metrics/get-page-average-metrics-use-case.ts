import { MetricsRepository } from "../../modules";
import { metricsSource } from "./metrics-sql";
import { PerformanceAverageMetricsResponse, PerformanceMetricEnum } from "../../types";
import { endOfUtcDay, filterByAverageMetric, startOfUtcDay } from "../../utils";

type GetMetricsAverageParams = {
  period: 'hourly' | 'daily' | 'weekly'
  startDate?: string
  endDate?: string
  page_id?: string
}

interface GetPageAverageMetricsUseCaseRequest {
  metric?: PerformanceMetricEnum
  filterPeriodOptions: GetMetricsAverageParams
}

export class GetPageAverageMetricsUseCase {
  constructor(private metricsRepository: MetricsRepository) { }

  async execute({ metric, filterPeriodOptions }: GetPageAverageMetricsUseCaseRequest) {
    const metricsAverage = await this._getMetricsByPeriod(filterPeriodOptions)

    const allMetricsResponseData = metricsAverage as PerformanceAverageMetricsResponse[]

    if (!metric) return allMetricsResponseData

    const filteredMetricsData = filterByAverageMetric(metric, allMetricsResponseData)

    return filteredMetricsData
  }

  async _getMetricsByPeriod({ period, startDate = '2000-01-01', endDate, page_id }: GetMetricsAverageParams) {
    if (!period || !page_id) {
      return null
    }

    const parsedStartDate = startOfUtcDay(startDate)
    const parsedEndDate = endDate ? endOfUtcDay(endDate) : new Date()
    const source = metricsSource(period)

    const results = await this.metricsRepository.query(
      `
      SELECT
        ${source.periodStart} AS period_start,
        ${source.averages}
      FROM ${source.table} m
      WHERE m.page_id = $1
        AND ${source.timeColumn} BETWEEN $2 AND $3
      GROUP BY ${source.periodStart}
      ORDER BY period_start;
      `,
      [page_id, parsedStartDate, parsedEndDate]
    );

    return results;
  }
}
