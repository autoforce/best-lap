import type {
  PageSnapshotData,
  SnapshotChecks,
  SnapshotLcp,
  SnapshotResource,
  SnapshotThirdParty,
} from '../modules/insights/page-snapshot.interface'

// Loosely typed on purpose: PageSpeed Insights responses change shape between Lighthouse versions
type AnyRecord = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

/** Hosts of the Autoforce platform: their files belong to the template, not to the dealer's tags */
export const PLATFORM_HOSTS = ['autodromo.com.br', 'autoforce.com.br', 'autoforce.com']

/** Audits whose items point to files worth tracking; total-byte-weight is kept even when it passes */
const RESOURCE_AUDITS = [
  'render-blocking-insight',
  'unused-javascript',
  'unused-css-rules',
  'image-delivery-insight',
  'legacy-javascript-insight',
  'bootup-time',
  'cache-insight',
  'font-display-insight',
  'total-byte-weight',
]
const ALWAYS_KEPT_AUDITS = new Set(['total-byte-weight'])
const PASSING_SCORE = 0.9
const MAX_ITEMS_PER_AUDIT = 5
const MAX_THIRD_PARTIES = 20
const MAX_KEY_LENGTH = 160
const MAX_SNIPPET_LENGTH = 200

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function round(value: unknown): number | undefined {
  const n = num(value)
  return n === undefined ? undefined : Math.round(n)
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return undefined
  }
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin
  } catch {
    return undefined
  }
}

const add = (a?: number, b?: number) => (a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0))

const stripWww = (host: string) => host.replace(/^www\./, '')

function sameSite(host: string, base: string) {
  const h = stripWww(host)
  const b = stripWww(base)
  return h === b || h.endsWith(`.${b}`)
}

/**
 * Host and path of a URL, without query string and with build hashes, UUIDs and long ids
 * replaced by "*", so "main-af7f8b75f41a1eea.js" on one site matches "main-0c2d9e11aa5b3f70.js" on another.
 */
export function resourceKey(url: string): string {
  let host: string
  let path: string
  try {
    const parsed = new URL(url)
    host = stripWww(parsed.host.toLowerCase())
    path = parsed.pathname
  } catch {
    return url.slice(0, MAX_KEY_LENGTH)
  }

  const normalized = path
    .split('/')
    .map((segment) =>
      segment
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '*')
        .replace(/[0-9a-f]{8,}/gi, (run) => (/\d/.test(run) ? '*' : run))
        .replace(/\d{6,}/g, '*')
    )
    .join('/')

  return `${host}${normalized}`.slice(0, MAX_KEY_LENGTH)
}

/**
 * Picks the parts of a Lighthouse result that explain a score: page weight by type, third
 * parties, the files flagged by the main audits, the LCP element and a few server checks.
 */
export function extractPageSnapshot(lighthouseResult: AnyRecord): PageSnapshotData {
  const audits: AnyRecord = lighthouseResult?.audits ?? {}
  const entities: AnyRecord[] = Array.isArray(lighthouseResult?.entities) ? lighthouseResult.entities : []
  const pageUrl: string = lighthouseResult?.finalDisplayedUrl ?? lighthouseResult?.mainDocumentUrl ?? lighthouseResult?.requestedUrl ?? ''
  const pageHost = hostOf(pageUrl)

  const isOwnHost = (host: string | undefined) =>
    !!host && ((!!pageHost && sameSite(host, pageHost)) || PLATFORM_HOSTS.some((platform) => sameSite(host, platform)))

  const entityByOrigin = new Map<string, AnyRecord>()
  const entityByName = new Map<string, AnyRecord>()
  for (const entity of entities) {
    if (typeof entity?.name === 'string') entityByName.set(entity.name, entity)
    for (const origin of entity?.origins ?? []) entityByOrigin.set(origin, entity)
  }

  const isOwnEntity = (entity: AnyRecord | undefined) =>
    !!entity && (entity.isFirstParty === true || (entity.origins ?? []).some((origin: string) => isOwnHost(hostOf(origin))))

  // Page weight per resource type
  const bytesByType: Record<string, number> = {}
  let totalBytes: number | undefined
  let requestCount: number | undefined
  for (const item of audits['resource-summary']?.details?.items ?? []) {
    const type = item?.resourceType
    const bytes = round(item?.transferSize)
    if (typeof type !== 'string' || bytes === undefined) continue
    if (type === 'total') {
      totalBytes = bytes
      requestCount = round(item.requestCount)
    } else if (type !== 'third-party') {
      bytesByType[type] = bytes
    }
  }

  // Third parties (Lighthouse lists every entity, the site itself included)
  const thirdParties: SnapshotThirdParty[] = []
  for (const item of audits['third-parties-insight']?.details?.items ?? []) {
    const name = typeof item?.entity === 'string' ? item.entity : item?.entity?.text
    if (typeof name !== 'string') continue
    const entity = entityByName.get(name)
    thirdParties.push({
      entity: name,
      category: typeof entity?.category === 'string' ? entity.category : undefined,
      own: isOwnEntity(entity),
      bytes: round(item.transferSize) ?? 0,
      main_thread_ms: round(item.mainThreadTime) ?? 0,
      requests: Array.isArray(item.subItems?.items) ? item.subItems.items.length : 0,
    })
  }
  thirdParties.sort((a, b) => b.main_thread_ms - a.main_thread_ms || b.bytes - a.bytes)

  // Files flagged by the resource audits, biggest first
  const resources: SnapshotResource[] = []
  for (const auditId of RESOURCE_AUDITS) {
    const audit = audits[auditId]
    if (!audit) continue
    if (!ALWAYS_KEPT_AUDITS.has(auditId) && (typeof audit.score !== 'number' || audit.score >= PASSING_SCORE)) continue

    // The same file loaded more than once (e.g. one gtag/js per Google tag id) becomes one item with a count
    const byKey = new Map<string, SnapshotResource>()
    for (const item of audit.details?.items ?? []) {
      const url = item?.url
      if (typeof url !== 'string' || !/^https?:/.test(url)) continue
      const key = resourceKey(url)
      const origin = originOf(url)
      const entity = origin ? entityByOrigin.get(origin) : undefined
      const wastedMs = round(item.wastedMs ?? (auditId === 'bootup-time' ? item.total : undefined)) || undefined
      const wastedBytes = round(item.wastedBytes) || undefined
      const totalBytes = round(item.totalBytes) || undefined

      const existing = byKey.get(key)
      if (existing) {
        existing.wasted_ms = add(existing.wasted_ms, wastedMs)
        existing.wasted_bytes = add(existing.wasted_bytes, wastedBytes)
        existing.total_bytes = add(existing.total_bytes, totalBytes)
        existing.count = (existing.count ?? 1) + 1
        continue
      }
      byKey.set(key, {
        audit: auditId,
        key,
        entity: typeof entity?.name === 'string' ? entity.name : undefined,
        own: entity ? isOwnEntity(entity) : isOwnHost(hostOf(url)),
        wasted_ms: wastedMs,
        wasted_bytes: wastedBytes,
        total_bytes: totalBytes,
      })
    }
    const items = [...byKey.values()]
    items.sort(
      (a, b) =>
        (b.wasted_ms ?? 0) - (a.wasted_ms ?? 0) ||
        (b.wasted_bytes ?? 0) - (a.wasted_bytes ?? 0) ||
        (b.total_bytes ?? 0) - (a.total_bytes ?? 0)
    )
    resources.push(...items.slice(0, MAX_ITEMS_PER_AUDIT))
  }

  return {
    total_bytes: totalBytes,
    request_count: requestCount,
    bytes_by_type: bytesByType,
    third_parties: thirdParties.slice(0, MAX_THIRD_PARTIES),
    resources,
    lcp: extractLcp(audits),
    checks: extractChecks(audits),
  }
}

function extractLcp(audits: AnyRecord): SnapshotLcp | null {
  const breakdownItems: AnyRecord[] = audits['lcp-breakdown-insight']?.details?.items ?? []
  const node = breakdownItems.find((item) => item?.type === 'node')
  const table = breakdownItems.find((item) => item?.type === 'table')
  if (!node && !table) return null

  const subpart = (name: string) => round(table?.items?.find((s: AnyRecord) => s?.subpart === name)?.duration)
  const lcp: SnapshotLcp = {
    selector: node?.selector,
    label: node?.nodeLabel,
    snippet: typeof node?.snippet === 'string' ? node.snippet.slice(0, MAX_SNIPPET_LENGTH) : undefined,
    ttfb_ms: subpart('timeToFirstByte'),
    load_delay_ms: subpart('resourceLoadDelay'),
    load_duration_ms: subpart('resourceLoadDuration'),
    render_delay_ms: subpart('elementRenderDelay'),
  }

  // The discovery checklist only exists when the LCP element is an image
  const discovery = audits['lcp-discovery-insight']
  const checklist = (discovery?.details?.items ?? []).find((item: AnyRecord) => item?.type === 'checklist')?.items
  if (checklist && discovery.scoreDisplayMode !== 'notApplicable') {
    lcp.is_image = true
    if (typeof checklist.eagerlyLoaded?.value === 'boolean') lcp.lazy_loaded = !checklist.eagerlyLoaded.value
    if (typeof checklist.priorityHinted?.value === 'boolean') lcp.priority_hinted = checklist.priorityHinted.value
    if (typeof checklist.requestDiscoverable?.value === 'boolean') lcp.discoverable = checklist.requestDiscoverable.value
  } else {
    lcp.is_image = typeof lcp.snippet === 'string' ? lcp.snippet.startsWith('<img') : undefined
  }

  return lcp
}

function extractChecks(audits: AnyRecord): SnapshotChecks {
  const latency = audits['document-latency-insight']?.details
  const domTotal = (audits['dom-size-insight']?.details?.items ?? []).find(
    (item: AnyRecord) => item?.statistic === 'Total elements'
  )
  const unsized = audits['unsized-images']
  const compression = latency?.items?.usesCompression?.value

  return {
    redirect_ms: round(latency?.debugData?.redirectDuration),
    server_response_ms: round(latency?.debugData?.serverResponseTime),
    compression: typeof compression === 'boolean' ? compression : undefined,
    dom_elements: round(domTotal?.value?.value),
    unsized_images:
      typeof unsized?.score === 'number' && unsized.score < 1 ? (unsized.details?.items ?? []).length : undefined,
  }
}
