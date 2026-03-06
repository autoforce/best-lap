import { MetricEntityUnchecked, MetricsRepository, PerformanceResult } from '@best-lap/core';
import { setUpQuery } from '../utils/set-up-query';
import { adaptLighthouseResultToMetricPattern } from '../utils/adapt-lighthouse-report-to-metric-pattern';

export type CollectPageMetricsServiceParams = {
  pageUrl: string;
  pageId: string;
}

export class CollectPageMetricsService {
  constructor(private metricsRepository: MetricsRepository) { }

  async execute({ pageUrl, pageId }: CollectPageMetricsServiceParams) {
    const url = setUpQuery(pageUrl)
    const response = await fetch(url)

    if (!response.ok) {
      const responseData = await response.json()
      throw new Error(`Network response was not ok, status: ${response.status} - Data: ${JSON.stringify(responseData)}`);
    }

    const responseData = await response.json() as PerformanceResult

    if (!responseData?.lighthouseResult) {
      const logMessage = `ERROR - RESULT IS UNAVAILABLE - PAGE: ${pageUrl} - RESPONSE: ${JSON.stringify(responseData)}`
      console.log(logMessage)

      return null
    }

    const metrics = adaptLighthouseResultToMetricPattern(responseData.lighthouseResult)

    const data: MetricEntityUnchecked = {
      page_id: pageId,
      time: new Date(),
      ...metrics,
    }

    await this.metricsRepository.create(data)
  }
}
