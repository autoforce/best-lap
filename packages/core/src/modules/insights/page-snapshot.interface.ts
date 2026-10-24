/**
 * A compact daily picture of a page, taken from the Lighthouse result: what the page loads,
 * who it belongs to and where the LCP time goes. A few KB per page and day, so it can be kept
 * for weeks and compared over time without storing the full report.
 */

/** Whose file it is: the site or the Autoforce platform (template), or a third party (tags) */
export interface SnapshotThirdParty {
  entity: string
  /** Lighthouse category: ad, analytics, social, tag-manager, marketing, customer-success, video, cdn, utility... */
  category?: string
  /** First party or Autoforce platform */
  own: boolean
  bytes: number
  main_thread_ms: number
  requests: number
}

/** A file flagged by one of the resource audits (render blocking, unused JS, image delivery...) */
export interface SnapshotResource {
  audit: string
  /** Host and path, without query string and with hashes replaced by "*", so the same file matches across sites */
  key: string
  entity?: string
  own: boolean
  wasted_ms?: number
  wasted_bytes?: number
  total_bytes?: number
  /** How many times the file was loaded, when more than once (values are summed) */
  count?: number
}

export interface SnapshotLcp {
  selector?: string
  label?: string
  snippet?: string
  is_image?: boolean
  ttfb_ms?: number
  load_delay_ms?: number
  load_duration_ms?: number
  render_delay_ms?: number
  /** Only for image LCPs */
  lazy_loaded?: boolean
  priority_hinted?: boolean
  discoverable?: boolean
}

export interface SnapshotChecks {
  redirect_ms?: number
  server_response_ms?: number
  compression?: boolean
  dom_elements?: number
  unsized_images?: number
}

export interface PageSnapshotData {
  total_bytes?: number
  request_count?: number
  /** Transfer size per resource type: image, script, font, stylesheet, document, media, other */
  bytes_by_type: Record<string, number>
  third_parties: SnapshotThirdParty[]
  resources: SnapshotResource[]
  lcp: SnapshotLcp | null
  checks: SnapshotChecks
}

export interface PageSnapshot extends PageSnapshotData {
  page_id: string
  /** Local calendar day (YYYY-MM-DD); one snapshot per page and day, the latest collection wins */
  day: string
  collected_at: Date
}

/** Daily weight of a page, for the trend chart */
export interface PageWeightPoint {
  day: string
  total_bytes: number | null
  request_count: number | null
  bytes_by_type: Record<string, number>
  third_party_ms: number
}

export interface SnapshotGroupFilter {
  theme?: string
  providerId?: string
}

/** A file found in several sites of a group (latest snapshot of each active channel's home) */
export interface GroupResource {
  key: string
  entity?: string
  own: boolean
  audits: string[]
  channels: number
  avg_wasted_ms?: number
  avg_wasted_bytes?: number
  avg_total_bytes?: number
  top_channels: Array<{ id: string; name: string }>
}

export interface GroupThirdParty {
  entity: string
  category?: string
  channels: number
  avg_main_thread_ms: number
  avg_bytes: number
}

export interface GroupLcpSummary {
  /** Channels whose LCP element is an image */
  image: number
  lazy_loaded: number
  missing_priority_hint: number
  not_discoverable: number
  avg_ttfb_ms?: number
  avg_load_delay_ms?: number
  avg_load_duration_ms?: number
  avg_render_delay_ms?: number
}

export interface GroupWeightSummary {
  avg_total_bytes?: number
  avg_requests?: number
  avg_bytes_by_type: Record<string, number>
  avg_third_party_ms?: number
}

export interface SnapshotGroupAggregate {
  channels_with_data: number
  resources: GroupResource[]
  third_parties: GroupThirdParty[]
  lcp: GroupLcpSummary
  weight: GroupWeightSummary
}

export interface PageSnapshotsRepository {
  upsert(snapshot: PageSnapshot): Promise<void>
  /** Latest snapshot of the page on or before the given day (or the latest one) */
  findLatest(pageId: string, onOrBefore?: string): Promise<PageSnapshot | null>
  /** Oldest snapshot of the page after the given day, used when there is no week-old one yet */
  findOldestAfter(pageId: string, after: string): Promise<PageSnapshot | null>
  history(pageId: string, days: number): Promise<PageWeightPoint[]>
  aggregateGroup(filter: SnapshotGroupFilter): Promise<SnapshotGroupAggregate>
}
