import { useState, useMemo, useEffect } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardOverviewCards } from '@/components/dashboard/dashboard-overview-cards'
import { ThemeDistributionCard } from '@/components/dashboard/theme-distribution-card'
import { TopBottomPerformersCard } from '@/components/dashboard/top-bottom-performers-card'
import { OverallPerformanceChart } from '@/components/dashboard/overall-performance-chart'
import { useChannels } from '@/hooks/use-channels'
import { useProviders } from '@/hooks/use-providers'
import { useAllMetrics, useProviderMetrics, useTriggerCollectionAll } from '@/hooks/use-metrics'
import type { Period } from '@/types/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TriggerCollectionDialog } from '@/components/trigger-collection-dialog'

const periodLabels: Record<Period, string> = {
  hourly: 'Última Hora',
  daily: 'Últimos 7 Dias',
  weekly: 'Últimas 4 Semanas',
  monthly: 'Últimos 6 Meses',
}

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [selectedProviderId, setSelectedProviderId] = useState<string>('all')

  const { data: channels = [], isLoading: isLoadingChannels } = useChannels()
  const { data: providers = [], isLoading: isLoadingProviders } = useProviders()
  const { data: allMetrics = [], isLoading: isLoadingAllMetrics } =
    useAllMetrics(period)
  const { mutate: triggerCollectionAll, isPending: isCollecting } =
    useTriggerCollectionAll()

  // Find autoforce provider ID
  const autoforceProviderId = useMemo(() => {
    return providers.find(
      (p) => p.slug === 'autoforce' || p.name.toLowerCase() === 'autoforce'
    )?.id
  }, [providers])

  // Enrich channels with default provider (autoforce) if not set
  const enrichedChannels = useMemo(() => {
    return channels.map((channel) => ({
      ...channel,
      provider_id: channel.provider_id || autoforceProviderId || undefined,
    }))
  }, [channels, autoforceProviderId])

  // Set default provider to 'autoforce' or first in list
  useEffect(() => {
    if (providers.length > 0 && selectedProviderId === 'all') {
      if (autoforceProviderId) {
        setSelectedProviderId(autoforceProviderId)
      } else {
        setSelectedProviderId(providers[0].id)
      }
    }
  }, [providers, selectedProviderId, autoforceProviderId])

  // Filter channels by selected provider
  const filteredChannels = useMemo(() => {
    if (selectedProviderId === 'all') return enrichedChannels
    return enrichedChannels.filter((channel) => channel.provider_id === selectedProviderId)
  }, [enrichedChannels, selectedProviderId])

  // Fetch provider-specific metrics using the new efficient endpoint
  const {
    data: providerMetrics = [],
    isLoading: isLoadingProviderMetrics,
  } = useProviderMetrics(
    selectedProviderId !== 'all' ? selectedProviderId : undefined,
    period
  )

  // Use provider-specific metrics when a provider is selected, otherwise use all metrics
  const displayMetrics = selectedProviderId === 'all' ? allMetrics : providerMetrics
  const isLoadingMetrics = selectedProviderId === 'all'
    ? isLoadingAllMetrics
    : isLoadingProviderMetrics

  const activeChannels = filteredChannels.filter((c) => c.active)

  return (
    <AppShell
      title="Dashboard"
      description="Visão geral das métricas de performance"
    >
      <div className="space-y-6">
        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filtros de Visualização</CardTitle>
              <TriggerCollectionDialog
                scope="all"
                channelsCount={activeChannels.length}
                onConfirm={() => triggerCollectionAll()}
                isPending={isCollecting}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Provider Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Provedor
                </label>
                <Select
                  value={selectedProviderId}
                  onValueChange={setSelectedProviderId}
                  disabled={isLoadingProviders}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Provedores</SelectItem>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Período
                </label>
                <Select
                  value={period}
                  onValueChange={(value) => setPeriod(value as Period)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(periodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <DashboardOverviewCards
          channels={filteredChannels}
          metrics={displayMetrics}
          isLoading={isLoadingChannels || isLoadingMetrics || isLoadingProviders}
        />

        {/* Performance Chart */}
        <OverallPerformanceChart
          data={displayMetrics}
          isLoading={isLoadingMetrics}
        />

        {/* Theme Distribution and Top/Bottom Performers */}
        <div className="grid gap-6 md:grid-cols-2">
          <ThemeDistributionCard
            channels={filteredChannels}
            isLoading={isLoadingChannels}
          />
          <TopBottomPerformersCard
            channels={filteredChannels}
            period={period}
            isLoading={isLoadingChannels || isLoadingMetrics}
          />
        </div>
      </div>
    </AppShell>
  )
}
