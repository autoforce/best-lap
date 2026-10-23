import type { FieldData, LighthouseFinding } from '../modules/insights/page-insights.interface'

// Loosely typed on purpose: PageSpeed Insights responses change shape between Lighthouse versions
type AnyRecord = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const IGNORED_DISPLAY_MODES = new Set(['informative', 'notApplicable', 'manual', 'error'])
const IGNORED_GROUPS = new Set(['metrics', 'hidden'])
const PASSING_SCORE = 0.9
const MAX_FINDINGS = 15

/** Markdown links ("[Learn more](https://...)") become plain text */
function stripMarkdownLinks(text: string | undefined): string | undefined {
  return text?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
}

function positive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function toFinding(audit: AnyRecord): LighthouseFinding {
  const metricSavings: Record<string, number> = {}
  for (const [metric, value] of Object.entries((audit.metricSavings ?? {}) as AnyRecord)) {
    const saved = positive(value)
    if (saved !== undefined) metricSavings[metric] = saved
  }

  // Time savings: the explicit total when present, otherwise the biggest time-based metric saving
  const timeSavings = ['LCP', 'FCP', 'TBT', 'INP'].map((m) => metricSavings[m]).filter((v): v is number => v !== undefined)
  const savingsMs = positive(audit.details?.overallSavingsMs) ?? (timeSavings.length ? Math.max(...timeSavings) : undefined)

  return {
    id: audit.id,
    title: audit.title,
    description: stripMarkdownLinks(audit.description),
    display_value: audit.displayValue,
    score: typeof audit.score === 'number' ? audit.score : null,
    savings_ms: savingsMs !== undefined ? Math.round(savingsMs) : undefined,
    savings_bytes: positive(audit.details?.overallSavingsBytes) !== undefined ? Math.round(audit.details.overallSavingsBytes) : undefined,
    metric_savings: Object.keys(metricSavings).length ? metricSavings : undefined,
  }
}

function hasSavings(finding: LighthouseFinding) {
  return Boolean(finding.savings_ms || finding.savings_bytes || (finding.metric_savings && Object.keys(finding.metric_savings).length))
}

/**
 * Picks the failing performance audits of a Lighthouse result and splits them into
 * opportunities (with estimated savings, biggest first) and other failing diagnostics.
 */
export function extractLighthouseFindings(lighthouseResult: AnyRecord): {
  opportunities: LighthouseFinding[]
  diagnostics: LighthouseFinding[]
  lighthouseVersion?: string
} {
  const audits: AnyRecord = lighthouseResult?.audits ?? {}
  const refs: AnyRecord[] = lighthouseResult?.categories?.performance?.auditRefs ?? []

  const opportunities: LighthouseFinding[] = []
  const diagnostics: LighthouseFinding[] = []

  for (const ref of refs) {
    if (IGNORED_GROUPS.has(ref.group)) continue
    const audit = audits[ref.id]
    if (!audit || IGNORED_DISPLAY_MODES.has(audit.scoreDisplayMode)) continue
    if (typeof audit.score !== 'number' || audit.score >= PASSING_SCORE) continue

    const finding = toFinding(audit)
    if (hasSavings(finding)) opportunities.push(finding)
    else diagnostics.push(finding)
  }

  opportunities.sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0) || (b.savings_bytes ?? 0) - (a.savings_bytes ?? 0))
  diagnostics.sort((a, b) => (a.score ?? 1) - (b.score ?? 1))

  return {
    opportunities: opportunities.slice(0, MAX_FINDINGS),
    diagnostics: diagnostics.slice(0, MAX_FINDINGS),
    lighthouseVersion: lighthouseResult?.lighthouseVersion,
  }
}

/** Real-user 75th percentiles from the PSI `loadingExperience` (CrUX). CLS comes multiplied by 100. */
export function extractFieldData(response: AnyRecord): FieldData | null {
  const experience = response?.loadingExperience
  const metrics = experience?.metrics
  if (!metrics || Object.keys(metrics).length === 0) return null

  const p75 = (key: string) => (typeof metrics[key]?.percentile === 'number' ? metrics[key].percentile : undefined)
  const cls = p75('CUMULATIVE_LAYOUT_SHIFT_SCORE')

  return {
    category: experience.overall_category,
    lcp_ms: p75('LARGEST_CONTENTFUL_PAINT_MS'),
    cls: cls !== undefined ? cls / 100 : undefined,
    inp_ms: p75('INTERACTION_TO_NEXT_PAINT'),
    fcp_ms: p75('FIRST_CONTENTFUL_PAINT_MS'),
    ttfb_ms: p75('EXPERIMENTAL_TIME_TO_FIRST_BYTE'),
    origin_fallback: experience.origin_fallback === true,
  }
}
