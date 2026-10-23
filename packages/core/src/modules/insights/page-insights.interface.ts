/** One Lighthouse finding kept for the "what to fix" list */
export interface LighthouseFinding {
  id: string
  title: string
  description?: string
  display_value?: string
  score: number | null
  /** Estimated time saved, in ms (overallSavingsMs or the largest metric saving) */
  savings_ms?: number
  /** Estimated bytes saved */
  savings_bytes?: number
  /** Savings per metric as reported by Lighthouse (LCP, FCP, TBT, CLS, INP) */
  metric_savings?: Record<string, number>
}

/** Real-user data (CrUX, 75th percentile) returned by PageSpeed Insights, when available */
export interface FieldData {
  category?: string
  lcp_ms?: number
  cls?: number
  inp_ms?: number
  fcp_ms?: number
  ttfb_ms?: number
  /** true when Google only had data for the whole origin, not for this URL */
  origin_fallback?: boolean
}

export interface PageInsightsEntity {
  page_id: string
  collected_at: Date
  lighthouse_version?: string
  opportunities: LighthouseFinding[]
  diagnostics: LighthouseFinding[]
  field_data?: FieldData | null
}

export interface PageInsightsWithContext extends PageInsightsEntity {
  page_name: string
  page_path: string
  channel_id: string
  channel_name: string
  theme: string
}

export interface PageInsightsFilter {
  channelId?: string
  theme?: string
  providerId?: string
  /** Only pages of active channels */
  activeOnly?: boolean
}

export interface PageInsightsRepository {
  upsert(insights: PageInsightsEntity): Promise<void>
  list(filter: PageInsightsFilter): Promise<PageInsightsWithContext[]>
}
