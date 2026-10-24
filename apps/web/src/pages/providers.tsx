import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
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
import { ProvidersTable } from '@/components/providers/providers-table'
import { ProviderDialog } from '@/components/providers/provider-dialog'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { PeriodSelector } from '@/components/metrics/period-selector'
import { MetricTrendChart, CHART_COLORS } from '@/components/metrics/metric-trend-chart'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { DeltaBadge } from '@/components/metrics/delta-badge'
import { useProviders } from '@/hooks/use-providers'
import { useChannels } from '@/hooks/use-channels'
import { useAllChannelsMetricsGrouped } from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import { aggregateByGroup } from '@/lib/aggregate'
import { METRICS, computeDelta, formatMetric, isBetter, rateMetric, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod, previousPeriodLabel } from '@/lib/period'
import type { Provider } from '@/types/api'

const PROVIDER_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'response_time', 'seo']
const MAX_COMPARED = 6

export function ProvidersPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<{ metric?: string; compare?: string }>()
  const metricKey: MetricKey = PROVIDER_METRICS.includes(search.metric as MetricKey)
    ? (search.metric as MetricKey)
    : 'score'

  const { data: providers = [], isLoading, isError } = useProviders()
  const { data: channels = [] } = useChannels()
  // One request for every channel, aggregated by provider here, instead of one request per provider
  const grouped = useAllChannelsMetricsGrouped(period)

  const providerOf = useMemo(() => {
    const map = new Map(channels.map((c) => [c.id, c.provider_id]))
    return (channelId: string) => map.get(channelId) ?? undefined
  }, [channels])

  const rows = useMemo(() => {
    const current = aggregateByGroup(grouped.data?.current ?? [], providerOf)
    const previous = aggregateByGroup(grouped.data?.previous ?? [], providerOf)
    return providers.map((provider) => ({
      provider,
      activeChannels: channels.filter((c) => c.provider_id === provider.id && c.active).length,
      series: current.get(provider.id) ?? [],
      summary: summarize(current.get(provider.id) ?? []),
      previous: summarize(previous.get(provider.id) ?? []),
    }))
  }, [grouped.data, providerOf, providers, channels])

  // Default comparison: every provider with active channels
  const compared = useMemo(() => {
    if (search.compare) return search.compare.split(',').filter((id) => id && id !== '-')
    return rows.filter((r) => r.activeChannels > 0).slice(0, MAX_COMPARED).map((r) => r.provider.id)
  }, [search.compare, rows])

  const comparedRows = rows.filter((r) => compared.includes(r.provider.id))

  const bestId = useMemo(() => {
    let best: { id: string; value: number } | null = null
    for (const row of comparedRows) {
      const value = row.summary[metricKey]
      if (value === null) continue
      if (!best || isBetter(metricKey, value, best.value)) best = { id: row.provider.id, value }
    }
    return comparedRows.length > 1 ? best?.id ?? null : null
  }, [comparedRows, metricKey])

  const toggleCompare = (providerId: string, checked: boolean) => {
    const next = checked ? [...compared, providerId].slice(0, MAX_COMPARED) : compared.filter((id) => id !== providerId)
    setSearch({ compare: next.length ? next.join(',') : '-' })
  }

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedProvider(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setSelectedProvider(null)
  }

  if (isError) {
    return (
      <AppShell title="Provedores" description="Plataformas que desenvolvem os sites">
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-destructive">Não foi possível carregar os provedores. Recarregue a página.</p>
        </div>
      </AppShell>
    )
  }

  const comparedTo = previousPeriodLabel(period)

  return (
    <AppShell
      title="Provedores"
      description="Plataformas que desenvolvem os sites e como cada uma performa"
      breadcrumbs={[{ label: 'Provedores' }]}
      action={
        <>
          <CopyLinkButton />
          <Button size="sm" onClick={handleCreate} disabled={isLoading}>
            <Plus />
            Novo provedor
          </Button>
        </>
      }
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
              <CardTitle>{METRICS[metricKey].label} por provedor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Média da home dos canais ativos de cada provedor · {describePeriod(period)}
              </p>
            </div>
            <SegmentedControl<MetricKey>
              label="Métrica"
              value={metricKey}
              options={PROVIDER_METRICS.map((m) => ({ value: m, label: METRICS[m].shortLabel }))}
              onChange={(metric) => setSearch({ metric: metric === 'score' ? undefined : metric })}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            {grouped.isLoading || isLoading ? (
              <div className="h-[320px] animate-pulse rounded-md bg-muted" />
            ) : comparedRows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Marque pelo menos um provedor na tabela abaixo para ver o gráfico.
              </p>
            ) : (
              <MetricTrendChart
                metric={metricKey}
                granularity={period.granularity}
                showLegend
                series={comparedRows.map((row, index) => ({
                  id: row.provider.id,
                  name: row.provider.name,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                  points: row.series,
                }))}
              />
            )}

            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">No gráfico</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead className="text-right">Canais ativos</TableHead>
                      <TableHead>{METRICS[metricKey].shortLabel}</TableHead>
                      <TableHead>Variação</TableHead>
                      {(['score', 'lcp', 'cls'] as MetricKey[])
                        .filter((m) => m !== metricKey)
                        .map((m) => (
                          <TableHead key={m}>{METRICS[m].shortLabel}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.provider.id}>
                        <TableCell>
                          <Checkbox
                            checked={compared.includes(row.provider.id)}
                            disabled={!compared.includes(row.provider.id) && compared.length >= MAX_COMPARED}
                            onCheckedChange={(checked) => toggleCompare(row.provider.id, !!checked)}
                            aria-label={`Mostrar ${row.provider.name} no gráfico`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link to="/providers/$providerId" params={{ providerId: row.provider.id }} className="hover:underline">
                            {row.provider.name}
                          </Link>
                          {row.provider.id === bestId && (
                            <span className="ml-2 rounded-full bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">
                              Melhor {METRICS[metricKey].shortLabel}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.activeChannels}</TableCell>
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
                <p className="mt-2 text-xs text-muted-foreground">Variação {comparedTo}.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro de provedores</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : providers.length === 0 ? (
              <div className="flex h-[160px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Nenhum provedor cadastrado.</p>
                  <Button variant="link" onClick={handleCreate} className="mt-2">
                    Cadastrar o primeiro provedor
                  </Button>
                </div>
              </div>
            ) : (
              <ProvidersTable data={providers} onEdit={handleEdit} />
            )}
          </CardContent>
        </Card>
      </div>

      <ProviderDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        provider={selectedProvider}
      />
    </AppShell>
  )
}
