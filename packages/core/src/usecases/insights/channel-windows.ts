import type { MetricsRepository } from '../../modules/metric/metrics-repository.interface'

export interface ChannelWindowRow {
  channel_id: string
  channel_name: string
  theme: string
  provider_id: string | null
  recent_score: number | null
  recent_lcp: number | null
  recent_cls: number | null
  baseline_score: number | null
  baseline_lcp: number | null
  baseline_cls: number | null
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const n = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(n) ? n : null
}

/** UTC midnight `days` before today (TimescaleDB daily buckets are UTC days) */
export function utcDaysAgo(days: number, now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days))
}

/**
 * Average of each active channel's home page in two consecutive windows of daily buckets:
 * baseline = [baselineStart, recentStart), recent = [recentStart, now].
 */
export async function queryChannelWindows(
  metricsRepository: MetricsRepository,
  { recentStart, baselineStart, providerId }: { recentStart: Date; baselineStart: Date; providerId?: string }
): Promise<ChannelWindowRow[]> {
  const params: unknown[] = [recentStart, baselineStart]
  let providerFilter = ''
  if (providerId) {
    params.push(providerId)
    providerFilter = 'AND c.provider_id = $3'
  }

  const rows = (await metricsRepository.query(
    `
    WITH home AS (
      SELECT p.id AS page_id, c.id AS channel_id, c.name AS channel_name, c.theme, c.provider_id
      FROM pages p
      INNER JOIN channels c ON c.id = p.channel_id
      WHERE p.path = '/' AND c.active = true ${providerFilter}
    ),
    recent AS (
      SELECT page_id, AVG(avg_score) AS score, AVG(avg_lcp) AS lcp, AVG(avg_cls) AS cls
      FROM metrics_daily WHERE bucket >= $1 GROUP BY page_id
    ),
    baseline AS (
      SELECT page_id, AVG(avg_score) AS score, AVG(avg_lcp) AS lcp, AVG(avg_cls) AS cls
      FROM metrics_daily WHERE bucket >= $2 AND bucket < $1 GROUP BY page_id
    )
    SELECT h.channel_id, h.channel_name, h.theme, h.provider_id,
      r.score AS recent_score, r.lcp AS recent_lcp, r.cls AS recent_cls,
      b.score AS baseline_score, b.lcp AS baseline_lcp, b.cls AS baseline_cls
    FROM home h
    LEFT JOIN recent r ON r.page_id = h.page_id
    LEFT JOIN baseline b ON b.page_id = h.page_id
    `,
    params
  )) as Record<string, unknown>[]

  return rows.map((row) => ({
    channel_id: String(row.channel_id),
    channel_name: String(row.channel_name),
    theme: String(row.theme),
    provider_id: (row.provider_id as string | null) ?? null,
    recent_score: toNumber(row.recent_score),
    recent_lcp: toNumber(row.recent_lcp),
    recent_cls: toNumber(row.recent_cls),
    baseline_score: toNumber(row.baseline_score),
    baseline_lcp: toNumber(row.baseline_lcp),
    baseline_cls: toNumber(row.baseline_cls),
  }))
}
