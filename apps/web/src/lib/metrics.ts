import type { AverageMetric } from '@/types/api'

export type MetricKey =
  | 'score'
  | 'seo'
  | 'response_time'
  | 'fcp'
  | 'si'
  | 'lcp'
  | 'tbt'
  | 'cls'

export type Rating = 'good' | 'warn' | 'poor'

export interface MetricDefinition {
  key: MetricKey
  label: string
  shortLabel: string
  description: string
  higherIsBetter: boolean
  /** Boundary of the "good" band (inclusive), in the raw unit stored by the API */
  good: number
  /** Boundary of the "poor" band (exclusive), in the raw unit stored by the API */
  poor: number
  source: string
}

export const RATING_LABELS: Record<Rating, string> = {
  good: 'Bom',
  warn: 'Precisa melhorar',
  poor: 'Ruim',
}

export const METRICS: Record<MetricKey, MetricDefinition> = {
  score: {
    key: 'score',
    label: 'Performance',
    shortLabel: 'Score',
    description:
      'Nota de performance do Lighthouse (0 a 100), calculada a partir de FCP, SI, LCP, TBT e CLS em um celular simulado.',
    higherIsBetter: true,
    good: 90,
    poor: 50,
    source: 'Lighthouse',
  },
  seo: {
    key: 'seo',
    label: 'SEO',
    shortLabel: 'SEO',
    description: 'Nota de SEO técnico do Lighthouse (0 a 100): meta tags, links rastreáveis, robots.txt e afins.',
    higherIsBetter: true,
    good: 90,
    poor: 50,
    source: 'Lighthouse',
  },
  lcp: {
    key: 'lcp',
    label: 'Largest Contentful Paint',
    shortLabel: 'LCP',
    description: 'Tempo até o maior elemento visível (normalmente o banner) aparecer. É um Core Web Vital.',
    higherIsBetter: false,
    good: 2500,
    poor: 4000,
    source: 'Core Web Vitals',
  },
  cls: {
    key: 'cls',
    label: 'Cumulative Layout Shift',
    shortLabel: 'CLS',
    description: 'Quanto o layout pula enquanto a página carrega. É um Core Web Vital. Quanto menor, melhor.',
    higherIsBetter: false,
    good: 0.1,
    poor: 0.25,
    source: 'Core Web Vitals',
  },
  fcp: {
    key: 'fcp',
    label: 'First Contentful Paint',
    shortLabel: 'FCP',
    description: 'Tempo até o primeiro texto ou imagem aparecer na tela.',
    higherIsBetter: false,
    good: 1800,
    poor: 3000,
    source: 'web.dev',
  },
  tbt: {
    key: 'tbt',
    label: 'Total Blocking Time',
    shortLabel: 'TBT',
    description: 'Tempo em que a página fica travada por JavaScript e não responde a toques.',
    higherIsBetter: false,
    good: 200,
    poor: 600,
    source: 'Lighthouse',
  },
  si: {
    key: 'si',
    label: 'Speed Index',
    shortLabel: 'SI',
    description: 'Velocidade com que o conteúdo visível é preenchido durante o carregamento.',
    higherIsBetter: false,
    good: 3400,
    poor: 5800,
    source: 'Lighthouse',
  },
  response_time: {
    key: 'response_time',
    label: 'Tempo de resposta do servidor',
    shortLabel: 'TTFB',
    description: 'Tempo até o servidor começar a responder (Time to First Byte).',
    higherIsBetter: false,
    good: 800,
    poor: 1800,
    source: 'web.dev',
  },
}

const SECONDS_METRICS: MetricKey[] = ['lcp', 'fcp', 'si']

const decimal = (value: number, digits: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function formatMetric(key: MetricKey, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (key === 'score' || key === 'seo') return String(Math.round(value))
  if (key === 'cls') return decimal(value, 3)
  if (SECONDS_METRICS.includes(key)) return `${decimal(value / 1000, 2)} s`
  return `${Math.round(value)} ms`
}

export function formatThreshold(key: MetricKey, value: number): string {
  if (key === 'score' || key === 'seo') return String(value)
  if (key === 'cls') return decimal(value, 2)
  if (SECONDS_METRICS.includes(key) || key === 'response_time') return `${decimal(value / 1000, 1)} s`
  return `${value} ms`
}

export function describeThresholds(key: MetricKey): { good: string; warn: string; poor: string } {
  const { good, poor, higherIsBetter } = METRICS[key]
  if (higherIsBetter) {
    return {
      good: `${good} – 100`,
      warn: `${poor} – ${good - 1}`,
      poor: `0 – ${poor - 1}`,
    }
  }
  return {
    good: `≤ ${formatThreshold(key, good)}`,
    warn: `≤ ${formatThreshold(key, poor)}`,
    poor: `> ${formatThreshold(key, poor)}`,
  }
}

export function rateMetric(key: MetricKey, value: number | null | undefined): Rating | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  const { good, poor, higherIsBetter } = METRICS[key]
  if (higherIsBetter) {
    // Scores are shown rounded (like Lighthouse does), so the band must match the number on screen
    const shown = Math.round(value)
    if (shown >= good) return 'good'
    if (shown < poor) return 'poor'
    return 'warn'
  }
  if (value <= good) return 'good'
  if (value > poor) return 'poor'
  return 'warn'
}

/** Reads `avg_<metric>` from an aggregated point; the API returns some averages as strings */
export function readMetric(point: Partial<AverageMetric> | null | undefined, key: MetricKey): number | null {
  if (!point) return null
  const raw = point[`avg_${key}` as keyof AverageMetric]
  if (raw === null || raw === undefined) return null
  const value = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
  return Number.isNaN(value) ? null : value
}

export type MetricSummary = Record<MetricKey, number | null>

/** Mean of each metric over a list of aggregated points (each point weighs the same) */
export function summarize(points: Partial<AverageMetric>[]): MetricSummary {
  const summary = {} as MetricSummary
  for (const key of Object.keys(METRICS) as MetricKey[]) {
    const values = points.map((p) => readMetric(p, key)).filter((v): v is number => v !== null)
    summary[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  }
  return summary
}

export interface MetricDelta {
  diff: number
  /** true when the change is an improvement, false when it is a regression, null when stable */
  improved: boolean | null
  label: string
}

const STABLE_EPSILON: Record<MetricKey, number> = {
  score: 0.5,
  seo: 0.5,
  lcp: 50,
  fcp: 50,
  si: 50,
  tbt: 10,
  response_time: 10,
  cls: 0.005,
}

export function computeDelta(
  key: MetricKey,
  current: number | null | undefined,
  previous: number | null | undefined
): MetricDelta | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  const diff = current - previous
  const stable = Math.abs(diff) < STABLE_EPSILON[key]
  const improved = stable ? null : METRICS[key].higherIsBetter ? diff > 0 : diff < 0
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  const abs = Math.abs(diff)

  let label: string
  if (key === 'score' || key === 'seo') label = `${sign}${Math.round(abs)} pts`
  else if (key === 'cls') label = `${sign}${decimal(abs, 3)}`
  else if (SECONDS_METRICS.includes(key)) label = `${sign}${decimal(abs / 1000, 2)} s`
  else label = `${sign}${Math.round(abs)} ms`

  return { diff, improved, label: stable ? 'estável' : label }
}

/** Picks the best value for a metric among candidates, respecting the metric direction */
export function isBetter(key: MetricKey, candidate: number, current: number): boolean {
  return METRICS[key].higherIsBetter ? candidate > current : candidate < current
}
