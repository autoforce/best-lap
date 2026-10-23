import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { METRICS, formatMetric, rateMetric, type MetricKey, type MetricSummary } from '@/lib/metrics'

interface ComparisonChannelCardProps {
  channelId: string
  /** Where the title links to: the channel page, the theme page or nowhere (providers) */
  linkTo?: 'channel' | 'theme' | null
  channelName: string
  active: boolean
  summary: MetricSummary
  color: string
  isLoading?: boolean
  isBest?: boolean
  bestLabel: string
}

const CARD_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'fcp', 'response_time', 'seo']

export function ComparisonChannelCard({
  channelId,
  linkTo = 'channel',
  channelName,
  active,
  summary,
  color,
  isLoading,
  isBest,
  bestLabel,
}: ComparisonChannelCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {CARD_METRICS.map((m) => (
            <Skeleton key={m} className="h-8" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const hasData = summary.score !== null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <CardTitle className="truncate text-base">
              {linkTo === 'channel' ? (
                <Link to="/channels/$channelId" params={{ channelId }} className="hover:underline">
                  {channelName}
                </Link>
              ) : linkTo === 'theme' ? (
                <Link to="/themes/$theme" params={{ theme: channelId }} className="hover:underline">
                  {channelName}
                </Link>
              ) : (
                channelName
              )}
            </CardTitle>
          </div>
          {isBest && <Badge className="shrink-0 bg-good text-white hover:bg-good">Melhor {bestLabel}</Badge>}
        </div>
        {!active && linkTo === 'channel' && <p className="text-xs text-warn">Canal inativo: sem coletas recentes.</p>}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem coletas neste período.</p>
        ) : (
          <dl className="divide-y">
            {CARD_METRICS.map((metric) => (
              <div key={metric} className="flex items-center justify-between gap-2 py-2 text-sm">
                <dt className="text-muted-foreground">{METRICS[metric].shortLabel}</dt>
                <dd>
                  <RatingBadge rating={rateMetric(metric, summary[metric])}>
                    {formatMetric(metric, summary[metric])}
                  </RatingBadge>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
