import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChannelCombobox } from '@/components/ui/channel-combobox'
import { ChannelsComparisonChart } from '@/components/compare/channels-comparison-chart'
import { ComparisonChannelCard } from '@/components/compare/comparison-channel-card'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { useChannels } from '@/hooks/use-channels'
import { useAllChannelsMetricsGrouped } from '@/hooks/use-metrics'
import type { Period } from '@/types/api'
import { ArrowLeftRight, X } from 'lucide-react'

const periodLabels: Record<Period, string> = {
  hourly: 'Por Hora',
  daily: 'Por Dia',
  weekly: 'Por Semana',
  monthly: 'Por Mês',
}

const metricOptions = [
  { value: 'avg_score', label: 'Performance Score' },
  { value: 'avg_seo', label: 'SEO Score' },
  { value: 'avg_response_time', label: 'Response Time' },
  { value: 'avg_lcp', label: 'LCP' },
  { value: 'avg_fcp', label: 'FCP' },
  { value: 'avg_cls', label: 'CLS' },
] as const

type MetricKey = (typeof metricOptions)[number]['value']

// Predefined colors for channels
const CHANNEL_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
]

export function ComparePage() {
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([])
  const [period, setPeriod] = useState<Period>('daily')
  const [metricKey, setMetricKey] = useState<MetricKey>('avg_score')

  const { data: channels, isLoading: isLoadingChannels } = useChannels()

  // Fetch metrics for ALL channels using optimized endpoint (single request)
  const { data: allChannelsMetrics, isLoading: isLoadingMetrics } = useAllChannelsMetricsGrouped(period)

  // Available channels for selection (not already selected)
  const availableChannels = useMemo(() => {
    return channels?.filter((c) => !selectedChannelIds.includes(c.id)) || []
  }, [channels, selectedChannelIds])

  // Can add more channels?
  const canAddMore = selectedChannelIds.length < 4

  // Handle channel selection
  const handleAddChannel = (channelId: string) => {
    if (canAddMore && channelId && !selectedChannelIds.includes(channelId)) {
      setSelectedChannelIds([...selectedChannelIds, channelId])
    }
  }

  // Handle channel removal
  const handleRemoveChannel = (channelId: string) => {
    setSelectedChannelIds(selectedChannelIds.filter((id) => id !== channelId))
  }

  // Prepare data for chart
  const chartData = useMemo(() => {
    if (!allChannelsMetrics) return []

    return selectedChannelIds.map((channelId, index) => {
      const channel = channels?.find((c) => c.id === channelId)

      // Filter metrics for this specific channel and convert to AverageMetric format
      const channelMetrics = allChannelsMetrics
        .filter(m => m.channel_id === channelId)
        .map(m => ({
          period_start: m.period_start,
          avg_score: m.avg_score,
          avg_seo: m.avg_seo,
          avg_response_time: m.avg_response_time,
          avg_fcp: m.avg_fcp,
          avg_si: m.avg_si,
          avg_lcp: m.avg_lcp,
          avg_tbt: m.avg_tbt,
          avg_cls: m.avg_cls,
        }))

      return {
        channelId,
        channelName: channel?.name || 'Unknown',
        metrics: channelMetrics,
        color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
      }
    })
  }, [selectedChannelIds, channels, allChannelsMetrics])

  // Prepare data for cards and table
  const comparisonData = useMemo(() => {
    return chartData.map((item) => {
      const latestMetric =
        item.metrics.length > 0 ? item.metrics[item.metrics.length - 1] : null
      return {
        ...item,
        latestMetric,
      }
    })
  }, [chartData])

  // Find best performing channel based on selected metric
  const bestChannelId = useMemo(() => {
    if (comparisonData.length === 0) return null

    let best = comparisonData[0]
    comparisonData.forEach((item) => {
      if (!item.latestMetric || !best.latestMetric) return

      let currentValue = item.latestMetric[metricKey]
      let bestValue = best.latestMetric[metricKey]

      // Handle response_time which can be string
      if (typeof currentValue === 'string') currentValue = parseFloat(currentValue)
      if (typeof bestValue === 'string') bestValue = parseFloat(bestValue)

      // For response time and CLS, lower is better
      if (metricKey === 'avg_response_time' || metricKey === 'avg_cls') {
        if (currentValue < bestValue) best = item
      } else {
        // For scores, higher is better
        if (currentValue > bestValue) best = item
      }
    })

    return best.channelId
  }, [comparisonData, metricKey])

  return (
    <AppShell
      title="Comparação"
      description="Compare a performance de múltiplos canais lado a lado"
      breadcrumbs={[{ label: 'Comparação' }]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Comparação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Selected Channels */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Canais Selecionados ({selectedChannelIds.length}/4)
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedChannelIds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum canal selecionado
                    </p>
                  ) : (
                    selectedChannelIds.map((channelId, index) => {
                      const channel = channels?.find((c) => c.id === channelId)
                      return (
                        <Badge
                          key={channelId}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                CHANNEL_COLORS[index % CHANNEL_COLORS.length],
                            }}
                          />
                          {channel?.name || 'Unknown'}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => handleRemoveChannel(channelId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Add Channel + Filters Row */}
              <div className="flex flex-col gap-4 md:flex-row">
                {/* Add Channel Select */}
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">
                    Adicionar Canal
                  </label>
                  <ChannelCombobox
                    channels={availableChannels}
                    value=""
                    onValueChange={handleAddChannel}
                    disabled={!canAddMore || isLoadingChannels}
                    placeholder={
                      canAddMore
                        ? 'Selecione um canal'
                        : 'Máximo de 4 canais'
                    }
                    emptyText="Nenhum canal disponível"
                  />
                </div>

                {/* Period Select */}
                <div className="w-full md:w-[200px]">
                  <label className="mb-2 block text-sm font-medium">
                    Período
                  </label>
                  <Select
                    value={period}
                    onValueChange={(value) => setPeriod(value as Period)}
                    disabled={selectedChannelIds.length === 0}
                  >
                    <SelectTrigger>
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

                {/* Metric Select */}
                <div className="w-full md:w-[200px]">
                  <label className="mb-2 block text-sm font-medium">
                    Métrica do Gráfico
                  </label>
                  <Select
                    value={metricKey}
                    onValueChange={(value) => setMetricKey(value as MetricKey)}
                    disabled={selectedChannelIds.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a métrica" />
                    </SelectTrigger>
                    <SelectContent>
                      {metricOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {selectedChannelIds.length === 0 ? (
          <Card>
            <CardContent className="flex h-[300px] items-center justify-center">
              <div className="text-center">
                <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Selecione pelo menos um canal para começar a comparação
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você pode comparar até 4 canais simultaneamente
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Comparison Chart */}
            {!isLoadingMetrics && chartData.length > 0 && (
              <ChannelsComparisonChart
                data={chartData}
                metricKey={metricKey}
                title={`Comparação - ${metricOptions.find((m) => m.value === metricKey)?.label}`}
              />
            )}

            {/* KPI Cards Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo das Métricas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Principais indicadores de performance de cada canal
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {comparisonData.map((item) => (
                    <ComparisonChannelCard
                      key={item.channelId}
                      channelName={item.channelName}
                      latestMetric={item.latestMetric}
                      color={item.color}
                      isLoading={isLoadingMetrics}
                      isBest={item.channelId === bestChannelId}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Comparison Table */}
            <ComparisonTable data={comparisonData} isLoading={isLoadingMetrics} />
          </>
        )}
      </div>
    </AppShell>
  )
}
