import { useState, useEffect } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PerformanceChart } from '@/components/dashboard/performance-chart'
import { useChannelsByTheme } from '@/hooks/use-channels'
import { metricsApi } from '@/lib/api/endpoints'
import type { Period, Channel } from '@/types/api'
import {
  Activity,
  Clock,
  Gauge,
  Search,
  TrendingUp,
  Layers,
  ExternalLink,
  ArrowLeft,
  Eye,
  BarChart3,
} from 'lucide-react'

const periodLabels: Record<Period, string> = {
  hourly: 'Por Hora',
  daily: 'Por Dia',
  weekly: 'Por Semana',
  monthly: 'Por Mês',
}

export function ThemeDetailsPage() {
  const params = useParams({ from: '/themes/$theme' })
  const theme = decodeURIComponent(params.theme)
  const [period, setPeriod] = useState<Period>('daily')

  // Reset period when theme changes
  useEffect(() => {
    setPeriod('daily')
  }, [theme])

  const { data: channelsData, isLoading: isLoadingChannels, error: channelsError } = useChannelsByTheme(theme)

  const { data: metricsData, isLoading: isLoadingMetrics, error: metricsError } = useQuery({
    queryKey: ['metrics', 'theme', theme, period],
    queryFn: async () => {
      const { data } = await metricsApi.getThemeAverage(theme, period)
      return data.metrics || []
    },
    staleTime: 0, // Always refetch when navigating
  })

  // Safe defaults
  const channels = Array.isArray(channelsData) ? channelsData : []
  const metrics = Array.isArray(metricsData) ? metricsData : []

  // Debug logs
  useEffect(() => {
    if (channelsError) {
      console.error('Error loading channels:', channelsError)
    }
    if (metricsError) {
      console.error('Error loading metrics:', metricsError)
    }
    console.log('Theme:', theme)
    console.log('Channels:', { data: channelsData, isArray: Array.isArray(channelsData), length: channels.length })
    console.log('Metrics:', { data: metricsData, isArray: Array.isArray(metricsData), length: metrics.length })
  }, [theme, channelsData, metricsData, channelsError, metricsError, channels.length, metrics.length])

  // Calculate statistics
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null
  const avgScore = latestMetric ? latestMetric.avg_score : 0
  const avgSEO = latestMetric ? latestMetric.avg_seo : 0
  const avgResponseTime = latestMetric
    ? typeof latestMetric.avg_response_time === 'string'
      ? parseFloat(latestMetric.avg_response_time)
      : latestMetric.avg_response_time
    : 0
  const avgLCP = latestMetric ? latestMetric.avg_lcp : 0

  // Channel statistics
  const totalChannels = channels.length
  const activeChannels = channels.filter((c) => c.active).length
  const referenceChannels = channels.filter((c) => c.is_reference).length

  // Show error state if there's an error
  if (channelsError) {
    return (
      <AppShell
        title={`Tema: ${theme}`}
        description={`Visão detalhada das métricas e canais do tema ${theme}`}
        breadcrumbs={[
          { label: 'Por Tema', href: '/themes' },
          { label: theme },
        ]}
      >
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/themes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para temas
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="flex h-[300px] items-center justify-center">
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-destructive/50" />
                <p className="mt-4 text-sm text-destructive">
                  Erro ao carregar canais do tema
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {channelsError instanceof Error ? channelsError.message : 'Erro desconhecido'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      key={theme}
      title={`Tema: ${theme}`}
      description={`Visão detalhada das métricas e canais do tema ${theme}`}
      breadcrumbs={[
        { label: 'Por Tema', href: '/themes' },
        { label: theme },
      ]}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/themes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para temas
            </Link>
          </Button>
        </div>

        {/* Period Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full md:w-[200px]">
              <label className="mb-2 block text-sm font-medium">Período</label>
              <Select
                value={period}
                onValueChange={(value) => setPeriod(value as Period)}
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
          </CardContent>
        </Card>

        {/* Channel Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Canais
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalChannels}</div>
              <p className="text-xs text-muted-foreground">
                Canais neste tema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Canais Ativos
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeChannels}</div>
              <p className="text-xs text-muted-foreground">
                {totalChannels > 0
                  ? `${((activeChannels / totalChannels) * 100).toFixed(0)}% do total`
                  : 'Nenhum canal'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Canais Referência
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referenceChannels}</div>
              <p className="text-xs text-muted-foreground">
                Usados como referência
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        {isLoadingMetrics ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
            </div>
            <Skeleton className="h-[400px]" />
          </div>
        ) : metrics.length === 0 ? (
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
              title={`Performance - ${theme} - ${periodLabels[period]}`}
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
                  <CardTitle className="text-base">Informações do Tema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nome</span>
                      <span className="font-medium capitalize">{theme}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total de Canais
                      </span>
                      <span className="font-medium">{totalChannels}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Canais Ativos
                      </span>
                      <span className="font-medium">{activeChannels}</span>
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

        {/* Channels List */}
        <Card>
          <CardHeader>
            <CardTitle>Canais do Tema</CardTitle>
            <p className="text-sm text-muted-foreground">
              Lista de todos os canais pertencentes a este tema
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingChannels ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : channels.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Domínio</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channels.map((channel: Channel) => (
                      <TableRow key={channel.id}>
                        <TableCell className="font-medium">{channel.name}</TableCell>
                        <TableCell>
                          <a
                            href={channel.domain}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            {channel.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                        <TableCell>
                          {channel.provider ? (
                            <Badge variant="secondary">{channel.provider.name}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={channel.active ? 'default' : 'secondary'}>
                            {channel.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {channel.is_reference ? (
                            <Badge variant="outline">Sim</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                to="/channels/$channelId"
                                params={{ channelId: channel.id }}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Ver
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                to="/metrics"
                                search={{ channelId: channel.id }}
                              >
                                <BarChart3 className="mr-1 h-3 w-3" />
                                Métricas
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Nenhum canal encontrado para este tema
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
