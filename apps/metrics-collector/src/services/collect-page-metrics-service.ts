import {
  MetricEntityUnchecked,
  MetricsRepository,
  PageInsightsRepository,
  PageSnapshotsRepository,
  PerformanceResult,
  extractFieldData,
  extractLighthouseFindings,
  extractPageSnapshot,
  localDay,
} from '@best-lap/core';
import { env } from '@best-lap/env';
import { setUpQuery } from '../utils/set-up-query';
import { adaptLighthouseResultToMetricPattern } from '../utils/adapt-lighthouse-report-to-metric-pattern';

export type CollectPageMetricsServiceParams = {
  pageUrl: string;
  pageId: string;
}

export class CollectPageMetricsService {
  constructor(
    private metricsRepository: MetricsRepository,
    private pageInsightsRepository: PageInsightsRepository,
    private pageSnapshotsRepository: PageSnapshotsRepository,
  ) { }

  /**
   * Runs PageSpeed Insights for one page and stores the metrics and the Lighthouse findings.
   * Throws on any failure so the queue retries the job and records it as failed.
   */
  async execute({ pageUrl, pageId }: CollectPageMetricsServiceParams) {
    const url = setUpQuery(pageUrl)

    let response: Response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(env.PSI_TIMEOUT_MS) })
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? `timeout after ${env.PSI_TIMEOUT_MS}ms` : String(error)
      throw new Error(`PageSpeed Insights request failed for ${pageUrl}: ${reason}`)
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`PageSpeed Insights returned ${response.status} for ${pageUrl}: ${body.slice(0, 500)}`)
    }

    const responseData = await response.json() as PerformanceResult

    if (!responseData?.lighthouseResult) {
      throw new Error(`PageSpeed Insights returned no Lighthouse result for ${pageUrl}`)
    }

    const collectedAt = new Date()
    const metrics = adaptLighthouseResultToMetricPattern(responseData.lighthouseResult)

    const data: MetricEntityUnchecked = {
      page_id: pageId,
      time: collectedAt,
      ...metrics,
    }

    await this.metricsRepository.create(data)

    // Findings are a bonus: a parsing problem must not lose the metrics already saved
    try {
      const findings = extractLighthouseFindings(responseData.lighthouseResult)
      await this.pageInsightsRepository.upsert({
        page_id: pageId,
        collected_at: collectedAt,
        lighthouse_version: findings.lighthouseVersion,
        opportunities: findings.opportunities,
        diagnostics: findings.diagnostics,
        field_data: extractFieldData(responseData),
      })
    } catch (error) {
      console.error(`Could not store Lighthouse findings for page ${pageId}:`, error)
    }

    // One compact snapshot per page and day (the latest collection of the day wins)
    try {
      await this.pageSnapshotsRepository.upsert({
        page_id: pageId,
        day: localDay(collectedAt, env.CRON_TIMEZONE),
        collected_at: collectedAt,
        ...extractPageSnapshot(responseData.lighthouseResult),
      })
    } catch (error) {
      console.error(`Could not store the page snapshot for page ${pageId}:`, error)
    }
  }
}
