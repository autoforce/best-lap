import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  METRICS,
  computeDelta,
  formatMetric,
  rateMetric,
  type MetricKey,
} from '@/lib/metrics'
import { RatingBadge } from './rating-badge'
import { DeltaBadge } from './delta-badge'
import { MetricInfo } from './metric-info'

interface MetricKpiCardProps {
  metric: MetricKey
  current: number | null
  previous?: number | null
  comparedTo?: string
  caption?: string
  isLoading?: boolean
}

/** KPI with the three things every number needs: value, official band and change */
export function MetricKpiCard({ metric, current, previous, comparedTo, caption, isLoading }: MetricKpiCardProps) {
  const definition = METRICS[metric]
  const rating = rateMetric(metric, current)
  const delta = computeDelta(metric, current, previous)
  const isScore = metric === 'score' || metric === 'seo'

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isScore ? definition.label : definition.shortLabel}
              </span>
              <MetricInfo metric={metric} />
            </div>
            {!isScore && <p className="truncate text-xs text-muted-foreground">{definition.label}</p>}
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {formatMetric(metric, current)}
                {isScore && current !== null && (
                  <span className="text-sm font-normal text-muted-foreground">/100</span>
                )}
              </span>
              <RatingBadge rating={rating} />
            </div>
            <DeltaBadge delta={delta} comparedTo={previous !== undefined ? comparedTo : undefined} />
            {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
