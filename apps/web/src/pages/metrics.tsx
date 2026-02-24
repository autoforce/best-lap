import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChannelCombobox } from '@/components/ui/channel-combobox'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { useChannels } from '@/hooks/use-channels'
import { useChannelMetrics } from '@/hooks/use-metrics'
import type { Period } from '@/types/api'
import { Activity, Clock, Gauge, Search, TrendingUp } from 'lucide-react'

const periodLabels: Record<Period, string> = {
  hourly: 'Por Hora',
  daily: 'Por Dia',
  weekly: 'Por Semana',
  monthly: 'Por Mês',
}

export function MetricsPage() {
  const search = useSearch({ from: '/metrics' }) as { channelId?: string }
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [period, setPeriod] = useState<Period>('daily')

  // Pre-select channel from URL parameter
  useEffect(() => {
    if (search.channelId) {
      setSelectedChannelId(search.channelId)
    }
  }, [search.channelId])

  const { data: channels, isLoading: isLoadingChannels } = useChannels()
  const { data: metrics, isLoading: isLoadingMetrics } = useChannelMetrics(
    selectedChannelId || undefined,
    period
  )

  const selectedChannel = channels?.find((c) => c.id === selectedChannelId)

  // Calculate statistics
  const latestMetric =
    metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null
  const avgScore = latestMetric ? latestMetric.avg_score : 0
  const avgSEO = latestMetric ? latestMetric.avg_seo : 0
  const avgResponseTime = latestMetric
    ? typeof latestMetric.avg_response_time === 'string'
      ? parseFloat(latestMetric.avg_response_time)
      : latestMetric.avg_response_time
    : 0
  const avgLCP = latestMetric ? latestMetric.avg_lcp : 0

  return (
    <AppShell
      title="Métricas"
      description="Visualize as métricas de performance dos seus canais"
      breadcrumbs={[{ label: 'Métricas' }]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">Canal</label>
                <ChannelCombobox
                  channels={channels || []}
                  value={selectedChannelId}
                  onValueChange={setSelectedChannelId}
                  disabled={isLoadingChannels}
                  placeholder="Selecione um canal"
                />
              </div>

              <div className="w-full md:w-[200px]">
                <label className="mb-2 block text-sm font-medium">Período</label>
                <Select
                  value={period}
                  onValueChange={(value) => setPeriod(value as Period)}
                  disabled={!selectedChannelId}
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
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {!selectedChannelId ? (
          <Card>
            <CardContent className="flex h-[300px] items-center justify-center">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Selecione um canal para visualizar as métricas
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoadingMetrics ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
            </div>
            <Skeleton className="h-[400px]" />
          </div>
        ) : !metrics || metrics.length === 0 ? (
          <Card>
            <CardContent className="flex h-[300px] items-center justify-center">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Nenhuma métrica disponível para este período.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As métricas serão coletadas automaticamente.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Performance Score
                  </CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgScore.toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /100
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pontuação média de performance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SEO Score</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgSEO.toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /100
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pontuação média de SEO
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tempo de Resposta
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgResponseTime.toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">
                      ms
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo médio de resposta
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Largest Contentful Paint
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(avgLCP / 1000).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      s
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo médio de LCP
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            <PerformanceChart
              data={metrics}
              title={`Performance - ${selectedChannel?.name} - ${periodLabels[period]}`}
            />

            {/* Additional Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Core Web Vitals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        First Contentful Paint (FCP)
                      </span>
                      <span className="font-medium">
                        {latestMetric
                          ? (latestMetric.avg_fcp / 1000).toFixed(2)
                          : '0.00'}
                        s
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Speed Index (SI)
                      </span>
                      <span className="font-medium">
                        {latestMetric
                          ? (latestMetric.avg_si / 1000).toFixed(2)
                          : '0.00'}
                        s
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Blocking Time (TBT)
                      </span>
                      <span className="font-medium">
                        {latestMetric ? latestMetric.avg_tbt.toFixed(0) : '0'}ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Cumulative Layout Shift (CLS)
                      </span>
                      <span className="font-medium">
                        {latestMetric ? latestMetric.avg_cls.toFixed(3) : '0.000'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações do Canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nome</span>
                      <span className="font-medium">
                        {selectedChannel?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tema</span>
                      <span className="font-medium">
                        {selectedChannel?.theme}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Páginas Monitoradas
                      </span>
                      <span className="font-medium">
                        {selectedChannel?.pages?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total de Medições
                      </span>
                      <span className="font-medium">{metrics.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
