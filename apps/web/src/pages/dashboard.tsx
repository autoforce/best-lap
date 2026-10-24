import { useMemo } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { ThemeDistributionCard } from '@/components/dashboard/theme-distribution-card'
import { TopBottomPerformersCard } from '@/components/dashboard/top-bottom-performers-card'
import { useChannels } from '@/hooks/use-channels'
import { useProviders } from '@/hooks/use-providers'
import {
  useAllChannelsMetricsGrouped,
  useAllMetrics,
  useProviderMetrics,
  useTriggerCollectionAll,
} from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { TriggerCollectionDialog } from '@/components/trigger-collection-dialog'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { PeriodSelector } from '@/components/metrics/period-selector'
import { MetricKpiCard } from '@/components/metrics/metric-kpi-card'
import { MetricTrendChart } from '@/components/metrics/metric-trend-chart'
import { MetricSummaryList } from '@/components/metrics/metric-summary-list'
import { AttentionSummary } from '@/components/insights/attention-panel'
import { CommonOpportunitiesCard } from '@/components/insights/common-opportunities-card'
import { WelcomeBanner } from '@/components/onboarding/welcome-banner'
import { METRICS, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod, previousPeriodLabel, rangeLabel } from '@/lib/period'

const CHART_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'response_time', 'seo']

export function DashboardPage() {
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<{ provider?: string; metric?: string }>()

  const { data: channels = [], isLoading: isLoadingChannels } = useChannels()
  const { data: providers = [], isLoading: isLoadingProviders } = useProviders()
  const { mutate: triggerCollectionAll, isPending: isCollecting } = useTriggerCollectionAll()

  const autoforceProviderId = useMemo(
    () => providers.find((p) => p.slug === 'autoforce' || p.name.toLowerCase() === 'autoforce')?.id,
    [providers]
  )

  // No provider in the URL means the default view (Autoforce); "all" is an explicit choice
  const providerId = search.provider ?? autoforceProviderId ?? 'all'
  const chartMetric: MetricKey = CHART_METRICS.includes(search.metric as MetricKey)
    ? (search.metric as MetricKey)
    : 'score'

  const allMetrics = useAllMetrics(period, providerId === 'all')
  const providerMetrics = useProviderMetrics(providerId !== 'all' ? providerId : undefined, period)
  const metrics = providerId === 'all' ? allMetrics : providerMetrics
  const grouped = useAllChannelsMetricsGrouped(period)

  // Same universe as the API: a channel belongs to a provider only when it is linked to it
  const filteredChannels = useMemo(
    () => (providerId === 'all' ? channels : channels.filter((c) => c.provider_id === providerId)),
    [channels, providerId]
  )
  const activeChannels = filteredChannels.filter((c) => c.active)
  const channelIds = useMemo(() => new Set(filteredChannels.map((c) => c.id)), [filteredChannels])

  const current = useMemo(() => summarize(metrics.data?.current ?? []), [metrics.data])
  const previous = useMemo(() => summarize(metrics.data?.previous ?? []), [metrics.data])
  const comparedTo = previousPeriodLabel(period)
  const isLoadingMetrics = metrics.isLoading || isLoadingProviders
  const providerName =
    providerId === 'all' ? 'Todos os provedores' : providers.find((p) => p.id === providerId)?.name ?? 'Provedor'

  return (
    <AppShell
      title="Dashboard"
      description="Saúde de performance dos sites monitorados"
      action={
        <>
          <AttentionSummary providerId={providerId === 'all' ? undefined : providerId} />
          <CopyLinkButton />
          <TriggerCollectionDialog
            scope="all"
            channelsCount={channels.filter((c) => c.active).length}
            onConfirm={() => triggerCollectionAll()}
            isPending={isCollecting}
          />
        </>
      }
    >
      <div className="space-y-6">
        <WelcomeBanner />

        <Card>
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
            <PeriodSelector value={period} onChange={setPeriod} />
            <div className="flex flex-col gap-1">
              <label htmlFor="dashboard-provider" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Provedor
              </label>
              <Select
                value={providerId}
                onValueChange={(value) => setSearch({ provider: value === autoforceProviderId ? undefined : value })}
                disabled={isLoadingProviders}
              >
                <SelectTrigger id="dashboard-provider" className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os provedores</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground tabular-nums">
                {activeChannels.length} {activeChannels.length === 1 ? 'canal ativo' : 'canais ativos'} nesta seleção
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(['score', 'lcp', 'cls', 'seo'] as MetricKey[]).map((metric) => (
            <MetricKpiCard
              key={metric}
              metric={metric}
              current={current[metric]}
              previous={previous[metric]}
              comparedTo={comparedTo}
              caption="Média da home dos canais ativos"
              isLoading={isLoadingMetrics}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="min-w-0">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{METRICS[chartMetric].label} ao longo do tempo</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {providerName} · {describePeriod(period)}
                  </p>
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
              {isLoadingMetrics ? (
                <div className="h-[320px] animate-pulse rounded-md bg-muted" />
              ) : (
                <MetricTrendChart
                  metric={chartMetric}
                  granularity={period.granularity}
                  series={[{ id: 'avg', name: providerName, points: metrics.data?.current ?? [] }]}
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
                isLoading={isLoadingMetrics}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ThemeDistributionCard channels={filteredChannels} isLoading={isLoadingChannels} />
          <TopBottomPerformersCard
            rows={grouped.data?.current ?? []}
            channelIds={providerId === 'all' ? undefined : channelIds}
            periodLabel={rangeLabel(period)}
            isLoading={grouped.isLoading || isLoadingChannels}
          />
        </div>

        <CommonOpportunitiesCard providerId={providerId === 'all' ? undefined : providerId} />
      </div>
    </AppShell>
  )
}
