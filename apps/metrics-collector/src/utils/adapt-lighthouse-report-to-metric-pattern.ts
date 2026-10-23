import { LighthouseResult } from "@best-lap/core";

export const adaptLighthouseResultToMetricPattern = (lighthouseResult: LighthouseResult) => {
  const performanceScore = lighthouseResult.categories.performance.score
  const seoScore = lighthouseResult.categories.seo.score
  const resultAudits = lighthouseResult.audits
  const responseTime = resultAudits['server-response-time'].numericValue;
  const fcp = resultAudits['first-contentful-paint'].numericValue
  const si = resultAudits['speed-index'].numericValue;
  const lcp = resultAudits['largest-contentful-paint'].numericValue;
  const tbt = resultAudits['total-blocking-time'].numericValue;
  const cls = resultAudits['cumulative-layout-shift'].numericValue;

  const metrics = {
    seo: seoScore * 100,
    score: performanceScore * 100,
    // The column is an integer; Lighthouse reports fractional milliseconds
    response_time: Math.round(responseTime),
    fcp,
    si,
    lcp,
    tbt,
    cls,
  }

  return metrics
}