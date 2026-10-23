import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { MetricInfo } from '@/components/metrics/metric-info'
import {
  METRICS,
  formatMetric,
  isBetter,
  rateMetric,
  type MetricKey,
  type MetricSummary,
} from '@/lib/metrics'

interface ComparisonTableProps {
  data: {
    channelId: string
    channelName: string
    summary: MetricSummary
    color: string
  }[]
  isLoading?: boolean
}

const TABLE_METRICS: MetricKey[] = ['score', 'seo', 'lcp', 'cls', 'tbt', 'fcp', 'si', 'response_time']

export function ComparisonTable({ data, isLoading }: ComparisonTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação detalhada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparação detalhada</CardTitle>
        <p className="text-sm text-muted-foreground">
          Média do período. O melhor valor de cada linha aparece em negrito.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Métrica</TableHead>
                {data.map((item) => (
                  <TableHead key={item.channelId} className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="whitespace-nowrap">{item.channelName}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TABLE_METRICS.map((metric) => {
                const values = data.map((item) => item.summary[metric])
                let bestIndex = -1
                values.forEach((value, index) => {
                  if (value === null) return
                  const best = bestIndex >= 0 ? values[bestIndex] : null
                  if (best === null || isBetter(metric, value, best)) bestIndex = index
                })

                return (
                  <TableRow key={metric}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1">
                        {METRICS[metric].label}
                        <MetricInfo metric={metric} />
                      </span>
                    </TableCell>
                    {data.map((item, index) => (
                      <TableCell key={item.channelId} className="text-right">
                        <RatingBadge
                          rating={rateMetric(metric, item.summary[metric])}
                          className={index === bestIndex && data.length > 1 ? 'font-bold ring-1 ring-current' : undefined}
                        >
                          {formatMetric(metric, item.summary[metric])}
                        </RatingBadge>
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
