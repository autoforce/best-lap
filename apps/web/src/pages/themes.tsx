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
import { ThemeCard } from '@/components/themes/theme-card'
import { ThemesComparisonChart } from '@/components/themes/themes-comparison-chart'
import { ThemesTable } from '@/components/themes/themes-table'
import { useChannels } from '@/hooks/use-channels'
import { useAllChannelsMetricsGrouped } from '@/hooks/use-metrics'
import type { Period, AverageMetric } from '@/types/api'
import { Layers, ChevronDown, ChevronUp, X } from 'lucide-react'

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
] as const

type MetricKey = (typeof metricOptions)[number]['value']

// Predefined colors for themes
const THEME_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function ThemesPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [metricKey, setMetricKey] = useState<MetricKey>('avg_score')
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false)
  const [selectedThemesForComparison, setSelectedThemesForComparison] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState(false)

  const { data: channels, isLoading: isLoadingChannels } = useChannels()

  // Extract unique themes from channels
  const themes = useMemo(() => {
    if (!channels) return []
    const uniqueThemes = new Set(channels.map((c) => c.theme))
    return Array.from(uniqueThemes).filter(Boolean).sort()
  }, [channels])

  // Fetch metrics for ALL channels using optimized endpoint (single request)
  const { data: allChannelsMetrics, isLoading: isLoadingMetrics } = useAllChannelsMetricsGrouped(period)

  // Group metrics by theme
  const metricsGroupedByTheme = useMemo(() => {
    if (!allChannelsMetrics || !channels) return new Map<string, AverageMetric[]>()

    const groupedMap = new Map<string, AverageMetric[]>()

    allChannelsMetrics.forEach((metric) => {
      const channel = channels.find(c => c.id === metric.channel_id)
      if (!channel || !channel.theme) return

      const theme = channel.theme
      const existing = groupedMap.get(theme) || []

      // Group metrics by period_start for this theme
      groupedMap.set(theme, [
        ...existing,
        {
          period_start: metric.period_start,
          avg_score: metric.avg_score,
          avg_seo: metric.avg_seo,
          avg_response_time: metric.avg_response_time,
          avg_fcp: metric.avg_fcp,
          avg_si: metric.avg_si,
          avg_lcp: metric.avg_lcp,
          avg_tbt: metric.avg_tbt,
          avg_cls: metric.avg_cls,
        }
      ])
    })

    // Aggregate metrics by period for each theme
    const aggregatedMap = new Map<string, AverageMetric[]>()

    groupedMap.forEach((metrics, theme) => {
      const metricsByPeriod = new Map<string, AverageMetric[]>()

      metrics.forEach((metric) => {
        const existing = metricsByPeriod.get(metric.period_start) || []
        metricsByPeriod.set(metric.period_start, [...existing, metric])
      })

      const aggregated: AverageMetric[] = Array.from(metricsByPeriod.entries()).map(
        ([period_start, metrics]) => {
          const count = metrics.length
          return {
            period_start,
            avg_score: metrics.reduce((sum, m) => sum + m.avg_score, 0) / count,
            avg_seo: metrics.reduce((sum, m) => sum + m.avg_seo, 0) / count,
            avg_response_time:
              metrics.reduce((sum, m) => {
                const rt = typeof m.avg_response_time === 'string'
                  ? parseFloat(m.avg_response_time)
                  : m.avg_response_time
                return sum + rt
              }, 0) / count,
            avg_fcp: metrics.reduce((sum, m) => sum + m.avg_fcp, 0) / count,
            avg_si: metrics.reduce((sum, m) => sum + m.avg_si, 0) / count,
            avg_lcp: metrics.reduce((sum, m) => sum + m.avg_lcp, 0) / count,
            avg_tbt: metrics.reduce((sum, m) => sum + m.avg_tbt, 0) / count,
            avg_cls: metrics.reduce((sum, m) => sum + m.avg_cls, 0) / count,
          }
        }
      )

      aggregatedMap.set(theme, aggregated.sort((a, b) => a.period_start.localeCompare(b.period_start)))
    })

    return aggregatedMap
  }, [allChannelsMetrics, channels])

  // Handle theme selection for comparison
  const handleAddThemeToComparison = (theme: string) => {
    if (selectedThemesForComparison.length < 4 && !selectedThemesForComparison.includes(theme)) {
      setSelectedThemesForComparison([...selectedThemesForComparison, theme])
    }
  }

  const handleRemoveThemeFromComparison = (theme: string) => {
    setSelectedThemesForComparison(selectedThemesForComparison.filter((t) => t !== theme))
  }

  const handleStartComparison = () => {
    setComparisonMode(true)
  }

  const handleExitComparison = () => {
    setComparisonMode(false)
    setSelectedThemesForComparison([])
  }

  // Available themes for selection (not already selected)
  const availableThemes = useMemo(() => {
    return themes.filter((t) => !selectedThemesForComparison.includes(t))
  }, [themes, selectedThemesForComparison])

  // Can add more themes?
  const canAddMore = selectedThemesForComparison.length < 4

  // Prepare data for cards
  const themeCardsData = useMemo(() => {
    // In comparison mode, only process selected themes; otherwise, all themes
    const themesToProcess = comparisonMode ? selectedThemesForComparison : themes

    return themesToProcess.map((theme) => {
      const metrics = metricsGroupedByTheme.get(theme) || []
      const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null

      const channelCount = channels?.filter((c) => c.theme === theme).length || 0

      let value = 0
      if (latestMetric) {
        if (metricKey === 'avg_score') {
          value = latestMetric.avg_score
        } else if (metricKey === 'avg_seo') {
          value = latestMetric.avg_seo
        } else if (metricKey === 'avg_response_time') {
          value = typeof latestMetric.avg_response_time === 'string'
            ? parseFloat(latestMetric.avg_response_time)
            : latestMetric.avg_response_time
        }
      }

      return {
        theme,
        channelCount,
        value,
      }
    })
  }, [themes, selectedThemesForComparison, comparisonMode, metricsGroupedByTheme, channels, metricKey])

  // Prepare data for chart (either all themes or selected ones)
  const chartData = useMemo(() => {
    const themesForChart = comparisonMode ? selectedThemesForComparison : themes
    return themesForChart.map((theme, index) => {
      return {
        theme,
        metrics: metricsGroupedByTheme.get(theme) || [],
        color: THEME_COLORS[index % THEME_COLORS.length],
      }
    })
  }, [themes, selectedThemesForComparison, comparisonMode, metricsGroupedByTheme])

  // Prepare data for table (with comparison data)
  const tableData = useMemo(() => {
    // In normal mode, use all themes; in comparison mode, use selected themes
    const themesToProcess = comparisonMode ? selectedThemesForComparison : themes

    return themesToProcess.map((theme) => {
      const metrics = metricsGroupedByTheme.get(theme) || []
      const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null

      const channelCount = channels?.filter((c) => c.theme === theme).length || 0
      const colorIndex = comparisonMode
        ? selectedThemesForComparison.indexOf(theme)
        : themes.indexOf(theme)

      return {
        theme,
        channelCount,
        avgScore: latestMetric?.avg_score || 0,
        avgSEO: latestMetric?.avg_seo || 0,
        avgResponseTime:
          typeof latestMetric?.avg_response_time === 'string'
            ? parseFloat(latestMetric.avg_response_time)
            : latestMetric?.avg_response_time || 0,
        avgFCP: latestMetric?.avg_fcp || 0,
        avgLCP: latestMetric?.avg_lcp || 0,
        avgCLS: latestMetric?.avg_cls || 0,
        avgTBT: latestMetric?.avg_tbt || 0,
        avgSI: latestMetric?.avg_si || 0,
        color: THEME_COLORS[colorIndex % THEME_COLORS.length],
      }
    })
  }, [themes, selectedThemesForComparison, comparisonMode, metricsGroupedByTheme, channels])

  // Find best performing theme based on selected metric
  const bestTheme = useMemo(() => {
    if (selectedThemesForComparison.length === 0 || !comparisonMode) return null

    const comparisonTableData = tableData.filter((item) =>
      selectedThemesForComparison.includes(item.theme)
    )

    if (comparisonTableData.length === 0) return null

    let best = comparisonTableData[0]
    comparisonTableData.forEach((item) => {
      let currentValue = item[metricKey.replace('avg_', 'avg') as keyof typeof item] as number
      let bestValue = best[metricKey.replace('avg_', 'avg') as keyof typeof best] as number

      // For response time and CLS, lower is better
      if (metricKey === 'avg_response_time') {
        if (currentValue < bestValue) best = item
      } else {
        // For scores, higher is better
        if (currentValue > bestValue) best = item
      }
    })

    return best.theme
  }, [selectedThemesForComparison, comparisonMode, tableData, metricKey])

  return (
    <AppShell
      title="Por Tema"
      description="Visualize e compare métricas de performance agrupadas por tema"
      breadcrumbs={[{ label: 'Por Tema' }]}
    >
      <div className="space-y-6">
        {/* Filters and Comparison Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {comparisonMode ? 'Modo Comparação' : 'Filtros'}
              </CardTitle>
              {!comparisonMode && themes.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartComparison}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Comparar Temas
                </Button>
              )}
              {comparisonMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitComparison}
                >
                  Sair da Comparação
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Comparison Mode: Theme Selection */}
              {comparisonMode && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Temas Selecionados ({selectedThemesForComparison.length}/4)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedThemesForComparison.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum tema selecionado
                      </p>
                    ) : (
                      selectedThemesForComparison.map((theme, index) => (
                        <Badge
                          key={theme}
                          variant="secondary"
                          className="gap-1 pr-1"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: THEME_COLORS[index % THEME_COLORS.length],
                            }}
                          />
                          {theme}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => handleRemoveThemeFromComparison(theme)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Add Theme + Filters Row */}
              <div className="flex flex-col gap-4 md:flex-row">
                {/* Add Theme Select (only in comparison mode) */}
                {comparisonMode && (
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium">
                      Adicionar Tema
                    </label>
                    <Select
                      value=""
                      onValueChange={handleAddThemeToComparison}
                      disabled={!canAddMore || isLoadingChannels}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            canAddMore
                              ? 'Selecione um tema'
                              : 'Máximo de 4 temas'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableThemes.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhum tema disponível
                          </SelectItem>
                        ) : (
                          availableThemes.map((theme) => (
                            <SelectItem key={theme} value={theme}>
                              {theme}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Period Select */}
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">
                    Período
                  </label>
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

                {/* Metric Select */}
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium">
                    Métrica Principal
                  </label>
                  <Select
                    value={metricKey}
                    onValueChange={(value) => setMetricKey(value as MetricKey)}
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

        {/* Comparison Chart */}
        {!isLoadingMetrics && chartData.length > 0 && (!comparisonMode || selectedThemesForComparison.length > 0) && (
          <ThemesComparisonChart
            data={chartData}
            metricKey={metricKey}
          />
        )}

        {/* Comparison Mode Empty State */}
        {comparisonMode && selectedThemesForComparison.length === 0 && (
          <Card>
            <CardContent className="flex h-[300px] items-center justify-center">
              <div className="text-center">
                <Layers className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Selecione pelo menos um tema para começar a comparação
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Você pode comparar até 4 temas simultaneamente
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Theme Cards Grid - Preview with Expand (only in normal mode) */}
        {!comparisonMode && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Visão Geral por Tema</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Resumo da métrica selecionada por tema
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Preview or Full Grid */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {isLoadingChannels || isLoadingMetrics
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <ThemeCard
                          key={i}
                          theme="Loading"
                          value={0}
                          label=""
                          channelCount={0}
                          isLoading
                        />
                      ))
                    : (isOverviewExpanded
                        ? themeCardsData
                        : themeCardsData.slice(0, 4)
                      ).map((data) => (
                        <ThemeCard
                          key={data.theme}
                          theme={data.theme}
                          value={data.value}
                          label={metricOptions.find((m) => m.value === metricKey)?.label || ''}
                          channelCount={data.channelCount}
                        />
                      ))}
                </div>

                {/* See More/Less Button */}
                {themeCardsData.length > 4 && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                    >
                      {isOverviewExpanded ? (
                        <>
                          <ChevronUp className="mr-1 h-4 w-4" />
                          Ver menos
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1 h-4 w-4" />
                          Ver mais {themeCardsData.length - 4} temas
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparison Mode: KPI Cards Grid */}
        {comparisonMode && selectedThemesForComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo das Métricas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Principais indicadores de performance de cada tema
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {selectedThemesForComparison.map((theme, index) => {
                  const data = themeCardsData.find((d) => d.theme === theme)
                  const isBest = theme === bestTheme

                  return (
                    <ThemeCard
                      key={theme}
                      theme={theme}
                      value={data?.value || 0}
                      label={metricOptions.find((m) => m.value === metricKey)?.label || ''}
                      channelCount={data?.channelCount || 0}
                      color={THEME_COLORS[index % THEME_COLORS.length]}
                      isBest={isBest}
                      isLoading={isLoadingMetrics}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Table (already filtered by tableData) */}
        {(!comparisonMode || selectedThemesForComparison.length > 0) && (
          <ThemesTable
            data={tableData}
            isLoading={isLoadingChannels || isLoadingMetrics}
          />
        )}

        {/* Empty State */}
        {!isLoadingChannels && themes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nenhum tema encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Crie canais com temas para visualizar as métricas aqui
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
