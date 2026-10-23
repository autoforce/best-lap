import { Skeleton } from '@/components/ui/skeleton'
import {
  METRICS,
  computeDelta,
  formatMetric,
  rateMetric,
  type MetricKey,
  type MetricSummary,
} from '@/lib/metrics'
import { RatingBadge } from './rating-badge'
import { DeltaBadge } from './delta-badge'
import { MetricInfo } from './metric-info'

interface MetricSummaryListProps {
  metrics: MetricKey[]
  current: MetricSummary
  previous?: MetricSummary
  isLoading?: boolean
}

/** Compact list of metrics: name, value, band and change */
export function MetricSummaryList({ metrics, current, previous, isLoading }: MetricSummaryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {metrics.map((m) => (
          <Skeleton key={m} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <dl className="divide-y">
      {metrics.map((metric) => {
        const value = current[metric]
        return (
          <div key={metric} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="min-w-0">
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium">{METRICS[metric].shortLabel}</span>
                <MetricInfo metric={metric} />
              </div>
              <p className="truncate text-xs text-muted-foreground">{METRICS[metric].label}</p>
            </dt>
            <dd className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap font-semibold tabular-nums">{formatMetric(metric, value)}</span>
                <RatingBadge rating={rateMetric(metric, value)} compact />
              </div>
              {previous && <DeltaBadge delta={computeDelta(metric, value, previous[metric])} />}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
