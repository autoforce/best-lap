import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Layers } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { MetricTrendChart, CHART_COLORS } from '@/components/metrics/metric-trend-chart'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { DeltaBadge } from '@/components/metrics/delta-badge'
import { MetricInfo } from '@/components/metrics/metric-info'
import { useChannels } from '@/hooks/use-channels'
import { useAllChannelsMetricsGrouped } from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import { aggregateByGroup } from '@/lib/aggregate'
import { METRICS, computeDelta, formatMetric, rateMetric, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod, previousPeriodLabel } from '@/lib/period'

const THEME_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'response_time', 'seo']
const MAX_COMPARED = 6

export function ThemesPage() {
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<{ metric?: string; compare?: string }>()
  const metricKey: MetricKey = THEME_METRICS.includes(search.metric as MetricKey)
    ? (search.metric as MetricKey)
    : 'score'
  const compared = useMemo(() => (search.compare ? search.compare.split(',').filter(Boolean) : []), [search.compare])

  const { data: channels = [], isLoading: isLoadingChannels } = useChannels()
  const grouped = useAllChannelsMetricsGrouped(period)

  const themeOf = useMemo(() => {
    const map = new Map(channels.map((c) => [c.id, c.theme]))
    return (channelId: string) => map.get(channelId)
  }, [channels])

  const rows = useMemo(() => {
    const current = aggregateByGroup(grouped.data?.current ?? [], themeOf)
    const previous = aggregateByGroup(grouped.data?.previous ?? [], themeOf)
    const themes = Array.from(new Set(channels.map((c) => c.theme).filter(Boolean)))

    return themes.map((theme) => {
      const themeChannels = channels.filter((c) => c.theme === theme)
      return {
        theme,
        channels: themeChannels.length,
        activeChannels: themeChannels.filter((c) => c.active).length,
        series: current.get(theme) ?? [],
        summary: summarize(current.get(theme) ?? []),
        previous: summarize(previous.get(theme) ?? []),
      }
    })
  }, [grouped.data, themeOf, channels])

  // Worst first for the chosen metric, themes without data at the end
  const sortedRows = useMemo(() => {
    const higherIsBetter = METRICS[metricKey].higherIsBetter
    return [...rows].sort((a, b) => {
      const va = a.summary[metricKey]
      const vb = b.summary[metricKey]
      if (va === null) return 1
      if (vb === null) return -1
      return higherIsBetter ? va - vb : vb - va
    })
  }, [rows, metricKey])

  // Without an explicit selection, the chart shows the themes with most active channels
  const chartThemes = compared.length
    ? compared
    : [...rows].sort((a, b) => b.activeChannels - a.activeChannels).slice(0, 4).map((r) => r.theme)

  const toggleCompare = (theme: string, checked: boolean) => {
    const next = checked ? [...compared, theme].slice(0, MAX_COMPARED) : compared.filter((t) => t !== theme)
    setSearch({ compare: next.length ? next.join(',') : undefined })
  }

  const isLoading = isLoadingChannels || grouped.isLoading
  const comparedTo = previousPeriodLabel(period)

  return (
    <AppShell
      title="Por Tema"
      description="Qual tema entrega os sites mais rápidos"
      breadcrumbs={[{ label: 'Por Tema' }]}
      action={<CopyLinkButton />}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <PeriodSelector value={period} onChange={setPeriod} />
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>{METRICS[metricKey].label} por tema</CardTitle>
              <p className="text-sm text-muted-foreground">
                {compared.length
                  ? `${compared.length} ${compared.length === 1 ? 'tema selecionado' : 'temas selecionados'}`
                  : 'Os 4 temas com mais canais ativos. Marque “Comparar” na tabela para escolher outros.'}{' '}
                · {describePeriod(period)}
              </p>
            </div>
            <SegmentedControl<MetricKey>
              label="Métrica"
              value={metricKey}
              options={THEME_METRICS.map((m) => ({ value: m, label: METRICS[m].shortLabel }))}
              onChange={(metric) => setSearch({ metric: metric === 'score' ? undefined : metric })}
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[340px] animate-pulse rounded-md bg-muted" />
            ) : (
              <MetricTrendChart
                metric={metricKey}
                granularity={period.granularity}
                height={340}
                showLegend
                series={chartThemes.map((theme, index) => ({
                  id: theme,
                  name: theme,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                  points: rows.find((r) => r.theme === theme)?.series ?? [],
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Temas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Média da home dos canais ativos de cada tema. Ordenado do pior para o melhor em{' '}
              {METRICS[metricKey].shortLabel}; variação {comparedTo}.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="font-medium">Nenhum tema encontrado</p>
                <p className="text-sm text-muted-foreground">Os temas aparecem quando há canais cadastrados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">Comparar</TableHead>
                      <TableHead>Tema</TableHead>
                      <TableHead className="text-right">Canais ativos</TableHead>
                      <TableHead>
                        <span className="inline-flex items-center gap-1">
                          {METRICS[metricKey].shortLabel}
                          <MetricInfo metric={metricKey} />
                        </span>
                      </TableHead>
                      <TableHead>Variação</TableHead>
                      {(['score', 'lcp', 'cls'] as MetricKey[])
                        .filter((m) => m !== metricKey)
                        .map((m) => (
                          <TableHead key={m}>{METRICS[m].shortLabel}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row) => (
                      <TableRow key={row.theme}>
                        <TableCell>
                          <Checkbox
                            checked={compared.includes(row.theme)}
                            disabled={!compared.includes(row.theme) && compared.length >= MAX_COMPARED}
                            onCheckedChange={(checked) => toggleCompare(row.theme, !!checked)}
                            aria-label={`Comparar ${row.theme}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            to="/themes/$theme"
                            params={{ theme: row.theme }}
                            className="font-medium hover:underline"
                          >
                            {row.theme}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.activeChannels}
                          <span className="text-muted-foreground"> / {row.channels}</span>
                        </TableCell>
                        <TableCell>
                          <RatingBadge rating={rateMetric(metricKey, row.summary[metricKey])} className="text-sm">
                            {formatMetric(metricKey, row.summary[metricKey])}
                          </RatingBadge>
                        </TableCell>
                        <TableCell>
                          <DeltaBadge delta={computeDelta(metricKey, row.summary[metricKey], row.previous[metricKey])} />
                        </TableCell>
                        {(['score', 'lcp', 'cls'] as MetricKey[])
                          .filter((m) => m !== metricKey)
                          .map((m) => (
                            <TableCell key={m}>
                              <RatingBadge rating={rateMetric(m, row.summary[m])}>
                                {formatMetric(m, row.summary[m])}
                              </RatingBadge>
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
