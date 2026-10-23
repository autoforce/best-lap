import { useMemo } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { PeriodSelector } from '@/components/metrics/period-selector'
import { MetricKpiCard } from '@/components/metrics/metric-kpi-card'
import { MetricTrendChart } from '@/components/metrics/metric-trend-chart'
import { MetricSummaryList } from '@/components/metrics/metric-summary-list'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { DeltaBadge } from '@/components/metrics/delta-badge'
import { Sparkline } from '@/components/metrics/sparkline'
import { CommonOpportunitiesCard } from '@/components/insights/common-opportunities-card'
import { useChannelsByTheme } from '@/hooks/use-channels'
import { useAllChannelsMetricsGrouped, useThemeMetrics } from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import { buildChannelSnapshots } from '@/lib/channel-performance'
import { METRICS, formatMetric, rateMetric, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod, previousPeriodLabel } from '@/lib/period'

const CHART_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'response_time', 'seo']
const LIST_PERIOD = { range: '30d', granularity: 'daily' } as const

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function ThemeDetailsPage() {
  const params = useParams({ from: '/themes/$theme' })
  const theme = safeDecode(params.theme)
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<{ metric?: string }>()
  const chartMetric: MetricKey = CHART_METRICS.includes(search.metric as MetricKey)
    ? (search.metric as MetricKey)
    : 'score'

  const { data: channelsData, isLoading: isLoadingChannels, error: channelsError } = useChannelsByTheme(theme)
  const metrics = useThemeMetrics(theme, period)
  const grouped = useAllChannelsMetricsGrouped(LIST_PERIOD)

  const channels = Array.isArray(channelsData) ? channelsData : []
  const current = useMemo(() => summarize(metrics.data?.current ?? []), [metrics.data])
  const previous = useMemo(() => summarize(metrics.data?.previous ?? []), [metrics.data])
  const snapshots = useMemo(() => buildChannelSnapshots(grouped.data?.all ?? []), [grouped.data])

  // Worst score first, so the channels that pull the theme down are at the top
  const sortedChannels = useMemo(
    () =>
      [...channels].sort((a, b) => {
        const sa = snapshots.get(a.id)?.score ?? null
        const sb = snapshots.get(b.id)?.score ?? null
        if (sa === null) return 1
        if (sb === null) return -1
        return sa - sb
      }),
    [channels, snapshots]
  )

  const activeChannels = channels.filter((c) => c.active).length
  const referenceChannels = channels.filter((c) => c.is_reference).length
  const comparedTo = previousPeriodLabel(period)

  return (
    <AppShell
      key={theme}
      title={`Tema: ${theme}`}
      description={`${activeChannels} de ${channels.length} canais ativos · ${referenceChannels} de referência`}
      breadcrumbs={[
        { label: 'Por Tema', href: '/themes' },
        { label: theme },
      ]}
      action={<CopyLinkButton />}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <PeriodSelector value={period} onChange={setPeriod} />
          </CardContent>
        </Card>

        {channelsError ? (
          <Card>
            <CardContent className="flex h-[200px] items-center justify-center text-sm text-destructive">
              Não foi possível carregar os canais deste tema. Recarregue a página.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(['score', 'lcp', 'cls', 'seo'] as MetricKey[]).map((metric) => (
                <MetricKpiCard
                  key={metric}
                  metric={metric}
                  current={current[metric]}
                  previous={previous[metric]}
                  comparedTo={comparedTo}
                  caption="Média da home dos canais ativos do tema"
                  isLoading={metrics.isLoading}
                />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="min-w-0">
                <CardHeader className="space-y-3">
                  <div>
                    <CardTitle>{METRICS[chartMetric].label} ao longo do tempo</CardTitle>
                    <p className="text-sm text-muted-foreground">{describePeriod(period)}</p>
                  </div>
                  <SegmentedControl<MetricKey>
                    label="Métrica do gráfico"
                    value={chartMetric}
                    options={CHART_METRICS.map((m) => ({ value: m, label: METRICS[m].shortLabel }))}
                    onChange={(metric) => setSearch({ metric: metric === 'score' ? undefined : metric })}
                  />
                </CardHeader>
                <CardContent>
                  {metrics.isLoading ? (
                    <div className="h-[320px] animate-pulse rounded-md bg-muted" />
                  ) : (
                    <MetricTrendChart
                      metric={chartMetric}
                      granularity={period.granularity}
                      series={[{ id: 'theme', name: theme, points: metrics.data?.current ?? [] }]}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Demais métricas</CardTitle>
                  <p className="text-sm text-muted-foreground">Média do período, {comparedTo}</p>
                </CardHeader>
                <CardContent>
                  <MetricSummaryList
                    metrics={['fcp', 'si', 'tbt', 'response_time']}
                    current={current}
                    previous={previous}
                    isLoading={metrics.isLoading}
                  />
                </CardContent>
              </Card>
            </div>

            <CommonOpportunitiesCard
              theme={theme}
              title="Problemas comuns no tema"
              description={`Oportunidades do Lighthouse que mais se repetem entre os sites ativos do tema ${theme}. Um problema presente na maioria dos sites costuma ser corrigido uma vez, no template.`}
            />

            <Card>
              <CardHeader>
                <CardTitle>Canais do tema</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Do pior para o melhor score nos últimos 7 dias. Variação contra os 7 dias anteriores.
                </p>
              </CardHeader>
              <CardContent>
                {isLoadingChannels ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : sortedChannels.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Canal</TableHead>
                          <TableHead>Score 7d</TableHead>
                          <TableHead>30 dias</TableHead>
                          <TableHead>Variação</TableHead>
                          <TableHead>LCP</TableHead>
                          <TableHead>Provedor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedChannels.map((channel) => {
                          const snapshot = snapshots.get(channel.id)
                          return (
                            <TableRow key={channel.id}>
                              <TableCell>
                                <Link
                                  to="/channels/$channelId"
                                  params={{ channelId: channel.id }}
                                  className="block hover:underline"
                                >
                                  <span className="block font-medium">{channel.name}</span>
                                  <span className="block text-xs text-muted-foreground">{channel.domain}</span>
                                </Link>
                              </TableCell>
                              <TableCell>
                                {snapshot?.score != null ? (
                                  <RatingBadge rating={rateMetric('score', snapshot.score)} className="text-sm">
                                    {formatMetric('score', snapshot.score)}
                                  </RatingBadge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Sparkline
                                  values={snapshot?.trend ?? []}
                                  tone={snapshot?.scoreDelta?.improved === false ? 'poor' : snapshot?.scoreDelta?.improved ? 'good' : 'neutral'}
                                />
                              </TableCell>
                              <TableCell>
                                <DeltaBadge delta={snapshot?.scoreDelta ?? null} />
                              </TableCell>
                              <TableCell>
                                {snapshot?.lcp != null ? (
                                  <RatingBadge rating={rateMetric('lcp', snapshot.lcp)}>
                                    {formatMetric('lcp', snapshot.lcp)}
                                  </RatingBadge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {channel.provider ? (
                                  <Badge variant="secondary">{channel.provider.name}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={channel.active ? 'default' : 'secondary'}>
                                  {channel.active ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    Nenhum canal neste tema.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
