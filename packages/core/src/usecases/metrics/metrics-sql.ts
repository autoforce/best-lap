export type MetricsPeriod = 'hourly' | 'daily' | 'weekly'

const SOURCES: Record<MetricsPeriod, { table: string; timeColumn: string; granularity: string; aggregated: boolean }> = {
  hourly: { table: 'metrics', timeColumn: 'time', granularity: 'hour', aggregated: false },
  daily: { table: 'metrics_daily', timeColumn: 'bucket', granularity: 'day', aggregated: true },
  weekly: { table: 'metrics_weekly', timeColumn: 'bucket', granularity: 'week', aggregated: true },
}

const METRIC_COLUMNS = ['score', 'response_time', 'fcp', 'si', 'lcp', 'tbt', 'cls', 'seo'] as const

/**
 * Where each period reads from (raw metrics or a continuous aggregate) and the SQL that
 * averages every metric as `avg_<metric>`. Values come from fixed whitelists, never from input.
 */
export function metricsSource(period: MetricsPeriod) {
  const source = SOURCES[period]
  if (!source) throw new Error(`Invalid period: ${period}`)

  const averages = METRIC_COLUMNS.map((metric) => {
    const column = source.aggregated ? `avg_${metric}` : metric
    return `AVG(m."${column}") AS avg_${metric}`
  }).join(',\n        ')

  return {
    table: source.table,
    timeColumn: `m.${source.timeColumn}`,
    periodStart: `DATE_TRUNC('${source.granularity}', m.${source.timeColumn})`,
    averages,
  }
}
