import { useMemo } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChannelCombobox } from '@/components/ui/channel-combobox'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ComparisonChannelCard } from '@/components/compare/comparison-channel-card'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { PeriodSelector } from '@/components/metrics/period-selector'
import { MetricTrendChart, CHART_COLORS, type TrendSeries } from '@/components/metrics/metric-trend-chart'
import { useChannels } from '@/hooks/use-channels'
import { useProviders } from '@/hooks/use-providers'
import { useAllChannelsMetricsGrouped } from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import { aggregateByGroup } from '@/lib/aggregate'
import { METRICS, isBetter, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod } from '@/lib/period'

const MAX_ITEMS = 6
const COMPARE_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'fcp', 'response_time', 'seo']

type Dimension = 'sites' | 'temas' | 'provedores'

const DIMENSION_LABELS: Record<Dimension, { label: string; singular: string; plural: string }> = {
  sites: { label: 'Sites', singular: 'canal', plural: 'canais' },
  temas: { label: 'Temas', singular: 'tema', plural: 'temas' },
  provedores: { label: 'Provedores', singular: 'provedor', plural: 'provedores' },
}

/** One tool to compare sites, themes or providers over the same period */
export function ComparePage() {
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<{ ids?: string; metric?: string; dim?: string; ref?: string }>()
  const dimension: Dimension = (['sites', 'temas', 'provedores'] as const).includes(search.dim as Dimension)
    ? (search.dim as Dimension)
    : 'sites'
  const showPortfolio = search.ref === 'portfolio'
  const selectedIds = useMemo(
    () => (search.ids ? search.ids.split(',').filter(Boolean).slice(0, MAX_ITEMS) : []),
    [search.ids]
  )
  const metricKey: MetricKey = COMPARE_METRICS.includes(search.metric as MetricKey)
    ? (search.metric as MetricKey)
    : 'score'

  const { data: channels = [], isLoading: isLoadingChannels } = useChannels()
  const { data: providers = [] } = useProviders()
  const grouped = useAllChannelsMetricsGrouped(period, selectedIds.length > 0)

  const setIds = (ids: string[]) => setSearch({ ids: ids.length ? ids.join(',') : undefined })
  const labels = DIMENSION_LABELS[dimension]

  // What can be picked in each dimension. Only active channels have recent metrics.
  const options = useMemo(() => {
    if (dimension === 'sites') {
      return channels.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))
    }
    if (dimension === 'temas') {
      return Array.from(new Set(channels.filter((c) => c.active).map((c) => c.theme)))
        .filter(Boolean)
        .sort()
        .map((theme) => ({ id: theme, name: theme }))
    }
    return providers.map((p) => ({ id: p.id, name: p.name }))
  }, [dimension, channels, providers])

  const nameOf = (id: string) => options.find((o) => o.id === id)?.name ?? (dimension === 'sites' ? 'Canal removido' : id)

  const items = useMemo(() => {
    const rows = grouped.data?.current ?? []
    const groupOf =
      dimension === 'sites'
        ? (channelId: string) => channelId
        : dimension === 'temas'
          ? (channelId: string) => channels.find((c) => c.id === channelId)?.theme
          : (channelId: string) => channels.find((c) => c.id === channelId)?.provider_id ?? undefined
    const series = aggregateByGroup(rows, groupOf)

    return selectedIds.map((id, index) => {
      const points = series.get(id) ?? []
      return {
        channelId: id,
        channelName: nameOf(id),
        active: dimension === 'sites' ? channels.find((c) => c.id === id)?.active ?? false : true,
        points,
        summary: summarize(points),
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
    })
    // nameOf depends on options, already listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, grouped.data, dimension, channels, options])

  // Reference line: every active channel together, each weighing the same
  const portfolio = useMemo(() => {
    if (!showPortfolio) return null
    const series = aggregateByGroup(grouped.data?.current ?? [], () => 'portfolio').get('portfolio') ?? []
    return { points: series, summary: summarize(series) }
  }, [showPortfolio, grouped.data])

  const bestId = useMemo(() => {
    let best: { id: string; value: number } | null = null
    for (const item of items) {
      const value = item.summary[metricKey]
      if (value === null) continue
      if (!best || isBetter(metricKey, value, best.value)) best = { id: item.channelId, value }
    }
    return items.length > 1 ? best?.id ?? null : null
  }, [items, metricKey])

  const available = options.filter((o) => !selectedIds.includes(o.id))
  const canAddMore = selectedIds.length < MAX_ITEMS
  const addItem = (id: string) => {
    if (id && canAddMore && !selectedIds.includes(id)) setIds([...selectedIds, id])
  }

  const chartSeries: TrendSeries[] = items.map((item) => ({
    id: item.channelId,
    name: item.channelName,
    color: item.color,
    points: item.points,
  }))
  if (portfolio) {
    chartSeries.push({ id: 'portfolio', name: 'Média do portfólio', color: 'hsl(var(--muted-foreground))', points: portfolio.points })
  }

  const tableData = portfolio
    ? [...items, { channelId: 'portfolio', channelName: 'Média do portfólio', summary: portfolio.summary, color: 'hsl(var(--muted-foreground))' }]
    : items

  return (
    <AppShell
      title="Comparação"
      description="Compare sites, temas ou provedores no mesmo período"
      breadcrumbs={[{ label: 'Comparação' }]}
      action={<CopyLinkButton />}
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comparar</span>
              <SegmentedControl<Dimension>
                label="O que comparar"
                value={dimension}
                options={(Object.keys(DIMENSION_LABELS) as Dimension[]).map((d) => ({ value: d, label: DIMENSION_LABELS[d].label }))}
                // Ids of one dimension mean nothing in another, so the selection starts over
                onChange={(dim) => setSearch({ dim: dim === 'sites' ? undefined : dim, ids: undefined })}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Selecionados <span className="text-muted-foreground tabular-nums">({selectedIds.length}/{MAX_ITEMS})</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum {labels.singular} selecionado.</p>
                ) : (
                  items.map((item) => (
                    <Badge key={item.channelId} variant="secondary" className="gap-1.5 py-1 pr-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.channelName}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-transparent"
                        onClick={() => setIds(selectedIds.filter((id) => id !== item.channelId))}
                        aria-label={`Remover ${item.channelName}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="w-full lg:max-w-sm">
                {dimension === 'sites' ? (
                  <ChannelCombobox
                    channels={channels.filter((c) => c.active && !selectedIds.includes(c.id))}
                    value=""
                    onValueChange={addItem}
                    disabled={!canAddMore || isLoadingChannels}
                    placeholder={canAddMore ? 'Adicionar canal ativo' : `Máximo de ${MAX_ITEMS} canais`}
                    emptyText="Nenhum canal ativo disponível"
                  />
                ) : (
                  <Select value="" onValueChange={addItem} disabled={!canAddMore || available.length === 0}>
                    <SelectTrigger aria-label={`Adicionar ${labels.singular}`}>
                      <SelectValue placeholder={canAddMore ? `Adicionar ${labels.singular}` : `Máximo de ${MAX_ITEMS} ${labels.plural}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="compare-portfolio"
                checked={showPortfolio}
                onCheckedChange={(checked) => setSearch({ ref: checked ? 'portfolio' : undefined })}
              />
              <Label htmlFor="compare-portfolio" className="text-sm font-normal">
                Incluir a média do portfólio como referência
              </Label>
            </div>
          </CardContent>
        </Card>

        {selectedIds.length === 0 ? (
          <Card>
            <CardContent className="flex h-[300px] items-center justify-center">
              <div className="text-center">
                <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Adicione pelo menos um {labels.singular} para começar a comparação.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  A seleção fica no endereço da página: copie o link para compartilhar a mesma comparação.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="min-w-0">
              <CardHeader className="space-y-3">
                <div>
                  <CardTitle>{METRICS[metricKey].label}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {dimension === 'sites' ? 'Home de cada canal' : `Média da home dos canais ativos de cada ${labels.singular}`} ·{' '}
                    {describePeriod(period)}
                  </p>
                </div>
                <SegmentedControl<MetricKey>
                  label="Métrica do gráfico"
                  value={metricKey}
                  options={COMPARE_METRICS.map((m) => ({ value: m, label: METRICS[m].shortLabel }))}
                  onChange={(metric) => setSearch({ metric: metric === 'score' ? undefined : metric })}
                />
              </CardHeader>
              <CardContent>
                {grouped.isLoading ? (
                  <div className="h-[360px] animate-pulse rounded-md bg-muted" />
                ) : (
                  <MetricTrendChart metric={metricKey} granularity={period.granularity} height={360} showLegend series={chartSeries} />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <ComparisonChannelCard
                  key={item.channelId}
                  channelId={item.channelId}
                  linkTo={dimension === 'sites' ? 'channel' : dimension === 'temas' ? 'theme' : null}
                  channelName={item.channelName}
                  active={item.active}
                  summary={item.summary}
                  color={item.color}
                  isLoading={grouped.isLoading}
                  isBest={item.channelId === bestId}
                  bestLabel={METRICS[metricKey].shortLabel}
                />
              ))}
            </div>

            <ComparisonTable data={tableData} isLoading={grouped.isLoading} />
          </>
        )}
      </div>
    </AppShell>
  )
}
