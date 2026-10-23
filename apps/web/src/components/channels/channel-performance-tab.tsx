import { useMemo } from 'react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PeriodSelector } from '@/components/metrics/period-selector'
import { MetricKpiCard } from '@/components/metrics/metric-kpi-card'
import { MetricTrendChart, type TrendSeries } from '@/components/metrics/metric-trend-chart'
import { MetricSummaryList } from '@/components/metrics/metric-summary-list'
import { useChannelMetrics, useRawMetrics, useThemeMetrics } from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import { METRICS, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod, previousPeriodLabel } from '@/lib/period'
import type { Channel } from '@/types/api'

const CHART_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'fcp', 'response_time', 'seo']

export function ChannelPerformanceTab({ channel }: { channel: Channel }) {
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<{ metric?: string; vs?: string; page?: string }>()
  const chartMetric: MetricKey = CHART_METRICS.includes(search.metric as MetricKey)
    ? (search.metric as MetricKey)
    : 'score'
  const showTheme = search.vs === 'tema'

  const pages = [...(channel.pages ?? [])].sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)))
  const homePage = pages.find((p) => p.path === '/')
  // A page from the URL must belong to this channel; otherwise fall back to the home
  const selectedPage = pages.find((p) => p.id === search.page) ?? homePage
  const isHome = !selectedPage || selectedPage.path === '/'

  const metrics = useChannelMetrics(channel.id, period, isHome ? undefined : selectedPage?.id)
  const themeMetrics = useThemeMetrics(showTheme ? channel.theme : undefined, period)
  const raw = useRawMetrics(channel.id)

  const current = useMemo(() => summarize(metrics.data?.current ?? []), [metrics.data])
  const previous = useMemo(() => summarize(metrics.data?.previous ?? []), [metrics.data])
  const comparedTo = previousPeriodLabel(period)

  const lastCollectedAt = useMemo(() => {
    const times = (raw.data ?? []).map((m) => new Date(m.time).getTime()).filter((t) => !Number.isNaN(t))
    return times.length ? new Date(Math.max(...times)) : null
  }, [raw.data])

  const hasHome = Boolean(homePage)
  const seriesName = isHome ? channel.name : `${channel.name} ${selectedPage?.path}`

  const series: TrendSeries[] = [{ id: 'channel', name: seriesName, points: metrics.data?.current ?? [] }]
  if (showTheme && themeMetrics.data) {
    series.push({
      id: 'theme',
      name: `Média do tema ${channel.theme}`,
      color: 'hsl(var(--muted-foreground))',
      points: themeMetrics.data.current,
    })
  }

  return (
    <div className="space-y-6">
      {!channel.active && (
        <div className="flex items-start gap-3 rounded-lg border border-warn/40 bg-warn-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <p>
            Este canal está <strong>inativo</strong>: ele não entra nas coletas agendadas nem nas médias do
            dashboard. Os dados abaixo são do período em que esteve ativo.
          </p>
        </div>
      )}
      {!hasHome && isHome && (
        <div className="flex items-start gap-3 rounded-lg border border-poor/40 bg-poor-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-poor" />
          <p>
            Este canal não tem a página <code>/</code> cadastrada. As métricas mostradas aqui são da home; cadastre-a
            na aba Páginas.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4">
            {pages.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="performance-page" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Página
                </label>
                <Select
                  value={selectedPage?.id}
                  onValueChange={(page) => setSearch({ page: page === homePage?.id ? undefined : page })}
                >
                  <SelectTrigger id="performance-page" className="w-full sm:w-[260px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name} ({page.path})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground lg:text-right">
            <p>
              {lastCollectedAt
                ? `Última coleta da home: ${format(lastCollectedAt, "dd/MM 'às' HH:mm")} (há ${formatDistanceToNowStrict(lastCollectedAt, { locale: ptBR })})`
                : raw.isLoading
                  ? 'Buscando última coleta…'
                  : 'Nenhuma coleta da home nos últimos 14 dias'}
            </p>
            <p>
              <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              Medição de laboratório em celular (PageSpeed Insights).
              {!isHome && ' A média do tema usa sempre a home dos canais.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {!metrics.isLoading && (metrics.data?.current.length ?? 0) === 0 && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">Ainda não há coletas desta página neste intervalo</p>
            <p className="text-muted-foreground">
              Páginas novas entram na próxima coleta agendada (veja o horário no topo da tela). Para ver agora, use
              “Coletar Performance”: cada página leva de 20 a 60 segundos.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(['score', 'lcp', 'cls', 'seo'] as MetricKey[]).map((metric) => (
          <MetricKpiCard
            key={metric}
            metric={metric}
            current={current[metric]}
            previous={previous[metric]}
            comparedTo={comparedTo}
            caption="Média do período"
            isLoading={metrics.isLoading}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{METRICS[chartMetric].label} ao longo do tempo</CardTitle>
                <p className="text-sm text-muted-foreground">{describePeriod(period)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="vs-theme"
                  checked={showTheme}
                  onCheckedChange={(checked) => setSearch({ vs: checked ? 'tema' : undefined })}
                />
                <Label htmlFor="vs-theme" className="text-sm font-normal">
                  Comparar com a média do tema
                </Label>
              </div>
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
              <MetricTrendChart metric={chartMetric} granularity={period.granularity} series={series} />
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
            {!metrics.isLoading && (
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground tabular-nums">
                {metrics.data?.current.length ?? 0} períodos com dados no intervalo
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
