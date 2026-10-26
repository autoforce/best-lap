import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SortingState } from '@tanstack/react-table'
import { Download, ExternalLink, Pencil, Search, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChannelsTable, type ChannelRow } from '@/components/channels/channels-table'
import { ChannelDialog } from '@/components/channels/channel-dialog'
import { BulkActionsToolbar } from '@/components/channels/bulk-actions-toolbar'
import { ProviderDialog } from '@/components/providers/provider-dialog'
import { AttentionSummary } from '@/components/insights/attention-panel'
import { CommonOpportunitiesCard } from '@/components/insights/common-opportunities-card'
import { GroupDiagnosisSection } from '@/components/insights/group-diagnosis'
import { PeriodSelector } from '@/components/metrics/period-selector'
import { MetricKpiCard } from '@/components/metrics/metric-kpi-card'
import { MetricTrendChart } from '@/components/metrics/metric-trend-chart'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { useChannels } from '@/hooks/use-channels'
import { useDeleteProvider, useProvider } from '@/hooks/use-providers'
import { useAllChannelsMetricsGrouped, useProviderMetrics } from '@/hooks/use-metrics'
import { usePeriodSearch, useSearchState } from '@/hooks/use-search-state'
import { useToast } from '@/hooks/use-toast'
import { buildChannelSnapshots } from '@/lib/channel-performance'
import { downloadCsv } from '@/lib/csv'
import { METRICS, formatMetric, rateMetric, summarize, type MetricKey } from '@/lib/metrics'
import { describePeriod, previousPeriodLabel } from '@/lib/period'
import type { Channel } from '@/types/api'

const TABS = ['overview', 'channels', 'themes', 'fix'] as const
type Tab = (typeof TABS)[number]
const CHART_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'response_time', 'seo']
// Daily rows of the last 30 days feed the per-channel score, trend and change
const LIST_PERIOD = { range: '30d', granularity: 'daily' } as const

type ProviderSearch = {
  tab?: string
  metric?: string
  q?: string
  status?: string
  theme?: string
  sort?: string
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

function parseSort(sort: string | undefined): SortingState {
  if (!sort) return []
  const desc = sort.startsWith('-')
  return [{ id: desc ? sort.slice(1) : sort, desc }]
}

export function ProviderDetailsPage() {
  const { providerId } = useParams({ from: '/providers/$providerId' })
  const navigate = useNavigate()
  const { toast } = useToast()
  const [period, setPeriod] = usePeriodSearch()
  const [search, setSearch] = useSearchState<ProviderSearch>()
  const activeTab: Tab = TABS.includes(search.tab as Tab) ? (search.tab as Tab) : 'overview'
  const chartMetric: MetricKey = CHART_METRICS.includes(search.metric as MetricKey) ? (search.metric as MetricKey) : 'score'

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: provider, isLoading, isError } = useProvider(providerId)
  const { data: allChannels = [], isLoading: isLoadingChannels } = useChannels()
  const metrics = useProviderMetrics(providerId, period)
  const grouped = useAllChannelsMetricsGrouped(LIST_PERIOD)
  const deleteProvider = useDeleteProvider()

  const channels = useMemo(() => allChannels.filter((c) => c.provider_id === providerId), [allChannels, providerId])
  const snapshots = useMemo(() => buildChannelSnapshots(grouped.data?.all ?? []), [grouped.data])
  const rows: ChannelRow[] = useMemo(
    () => channels.map((c) => ({ ...c, performance: snapshots.get(c.id) })),
    [channels, snapshots]
  )

  const current = useMemo(() => summarize(metrics.data?.current ?? []), [metrics.data])
  const previous = useMemo(() => summarize(metrics.data?.previous ?? []), [metrics.data])

  // Theme breakdown of this provider: how many sites each theme has and how they perform
  const themes = useMemo(() => {
    const byTheme = new Map<string, ChannelRow[]>()
    for (const row of rows) {
      const list = byTheme.get(row.theme) ?? []
      list.push(row)
      byTheme.set(row.theme, list)
    }
    return [...byTheme.entries()]
      .map(([theme, list]) => {
        const withScore = list.filter((r) => r.performance?.score != null)
        const worst = [...withScore].sort((a, b) => a.performance!.score! - b.performance!.score!)[0]
        return {
          theme,
          total: list.length,
          active: list.filter((r) => r.active).length,
          score: mean(withScore.map((r) => r.performance!.score!)),
          lcp: mean(list.map((r) => r.performance?.lcp).filter((v): v is number => v != null)),
          worst,
        }
      })
      .sort((a, b) => b.active - a.active)
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = (search.q ?? '').toLowerCase()
    return rows.filter((row) => {
      if (q && !row.name.toLowerCase().includes(q) && !row.domain.toLowerCase().includes(q)) return false
      if (search.status === 'active' && !row.active) return false
      if (search.status === 'inactive' && row.active) return false
      if (search.theme && row.theme !== search.theme) return false
      return true
    })
  }, [rows, search.q, search.status, search.theme])

  // A bulk action must only touch channels the user can see
  const filtersKey = `${search.q}|${search.status}|${search.theme}`
  useEffect(() => {
    setSelectedIds([])
  }, [filtersKey])

  const handleDeleteProvider = async () => {
    if (!provider) return
    try {
      await deleteProvider.mutateAsync(provider.id)
      toast({
        title: 'Provedor deletado',
        description: `${channels.length} ${channels.length === 1 ? 'canal ficou' : 'canais ficaram'} sem provedor. Nenhum canal foi apagado.`,
      })
      navigate({ to: '/providers' })
    } catch {
      toast({ title: 'Não foi possível deletar o provedor', description: 'Tente novamente em instantes.', variant: 'destructive' })
    }
  }

  const handleExport = () => {
    downloadCsv(
      `best-lap-${provider?.slug ?? 'provedor'}-canais-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Canal', 'Domínio', 'URL', 'Tema', 'Status', 'Score 7 dias', 'Variação (pts)', 'LCP (s)', 'CLS'],
      filteredRows.map((c) => [
        c.name,
        c.domain,
        c.internal_link,
        c.theme,
        c.active ? 'Ativo' : 'Inativo',
        c.performance?.score ?? null,
        c.performance?.scoreDelta?.diff ?? null,
        c.performance?.lcp != null ? c.performance.lcp / 1000 : null,
        c.performance?.cls ?? null,
      ])
    )
  }

  if (isLoading) {
    return (
      <AppShell title="Carregando..." description="Aguarde">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppShell>
    )
  }

  if (isError || !provider) {
    return (
      <AppShell title="Provedor não encontrado" description="Ele pode ter sido removido">
        <div className="flex h-[300px] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Não foi possível carregar este provedor.</p>
          <Button asChild>
            <Link to="/providers">Voltar para Provedores</Link>
          </Button>
        </div>
      </AppShell>
    )
  }

  const activeCount = channels.filter((c) => c.active).length
  const referenceCount = channels.filter((c) => c.is_reference).length
  const comparedTo = previousPeriodLabel(period)

  return (
    <AppShell
      title={provider.name}
      description={provider.website}
      breadcrumbs={[{ label: 'Provedores', href: '/providers' }, { label: provider.name }]}
      action={
        <>
          <AttentionSummary providerId={provider.id} />
          <CopyLinkButton />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Deletar provedor
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-2">
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {provider.website}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="text-sm text-muted-foreground">
                {provider.description || 'Sem descrição. Use “Editar” para descrever o provedor.'}
              </p>
              <p className="text-xs text-muted-foreground">
                Slug <code>{provider.slug}</code>
                {provider.created_at && ` · cadastrado em ${format(new Date(provider.created_at), 'dd/MM/yyyy', { locale: ptBR })}`}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-center tabular-nums md:text-right">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Canais ativos</dt>
                <dd className="text-2xl font-bold">
                  {isLoadingChannels ? '…' : activeCount}
                  <span className="text-sm font-normal text-muted-foreground"> / {channels.length}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Temas</dt>
                <dd className="text-2xl font-bold">{isLoadingChannels ? '…' : themes.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">De referência</dt>
                <dd className="text-2xl font-bold">{isLoadingChannels ? '…' : referenceCount}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={(tab) => setSearch({ tab: tab === 'overview' ? undefined : tab })}
          className="w-full"
        >
          <TabsList className="grid h-auto w-full max-w-[640px] grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="channels">Canais ({channels.length})</TabsTrigger>
            <TabsTrigger value="themes">Temas ({themes.length})</TabsTrigger>
            <TabsTrigger value="fix">O que corrigir</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardContent className="p-4">
                <PeriodSelector value={period} onChange={setPeriod} />
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
                  caption="Média da home dos canais ativos do provedor"
                  isLoading={metrics.isLoading}
                />
              ))}
            </div>

            <Card className="min-w-0">
              <CardHeader className="space-y-3">
                <div>
                  <CardTitle>{METRICS[chartMetric].label} ao longo do tempo</CardTitle>
                  <p className="text-sm text-muted-foreground">{describePeriod(period)}</p>
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
                  <MetricTrendChart
                    metric={chartMetric}
                    granularity={period.granularity}
                    series={[{ id: 'provider', name: provider.name, points: metrics.data?.current ?? [] }]}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou domínio..."
                    value={search.q ?? ''}
                    onChange={(e) => setSearch({ q: e.target.value || undefined })}
                    className="pl-9"
                    aria-label="Buscar canais do provedor"
                  />
                </div>
                <Select value={search.theme ?? 'all'} onValueChange={(theme) => setSearch({ theme: theme === 'all' ? undefined : theme })}>
                  <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrar por tema">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os temas</SelectItem>
                    {themes.map((t) => (
                      <SelectItem key={t.theme} value={t.theme}>
                        {t.theme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={search.status ?? 'all'} onValueChange={(status) => setSearch({ status: status === 'all' ? undefined : status })}>
                  <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filtrar por status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredRows.length === 0}>
                <Download />
                Exportar CSV
              </Button>
            </div>

            {selectedIds.length > 0 && (
              <BulkActionsToolbar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} />
            )}

            {isLoadingChannels ? (
              <Skeleton className="h-[400px] w-full" />
            ) : channels.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Nenhum canal ligado a este provedor.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Na lista de Canais, selecione os canais e use “Atribuir provedor”.
                  </p>
                </div>
              </div>
            ) : (
              <ChannelsTable
                data={filteredRows}
                onEdit={(channel) => setEditingChannel(channel)}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                sorting={parseSort(search.sort)}
                onSortingChange={(next) =>
                  setSearch({ sort: next[0] ? `${next[0].desc ? '-' : ''}${next[0].id}` : undefined })
                }
                isLoadingMetrics={grouped.isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="themes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Temas deste provedor</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Score e LCP: média da home dos canais de cada tema nos últimos 7 dias.
                </p>
              </CardHeader>
              <CardContent>
                {themes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum canal ligado a este provedor.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tema</TableHead>
                          <TableHead className="text-right">Canais ativos</TableHead>
                          <TableHead>Score 7d</TableHead>
                          <TableHead>LCP</TableHead>
                          <TableHead>Pior canal</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {themes.map((t) => (
                          <TableRow key={t.theme}>
                            <TableCell className="font-medium">
                              <Link to="/themes/$theme" params={{ theme: t.theme }} className="hover:underline">
                                {t.theme}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {t.active}
                              <span className="text-muted-foreground"> / {t.total}</span>
                            </TableCell>
                            <TableCell>
                              <RatingBadge rating={rateMetric('score', t.score)} className="text-sm">
                                {formatMetric('score', t.score)}
                              </RatingBadge>
                            </TableCell>
                            <TableCell>
                              <RatingBadge rating={rateMetric('lcp', t.lcp)}>{formatMetric('lcp', t.lcp)}</RatingBadge>
                            </TableCell>
                            <TableCell>
                              {t.worst ? (
                                <Link
                                  to="/channels/$channelId"
                                  params={{ channelId: t.worst.id }}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {t.worst.name} ({formatMetric('score', t.worst.performance?.score)})
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSearch({ tab: 'channels', theme: t.theme, sort: 'score' })}
                              >
                                Ver canais
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fix" className="mt-6 space-y-6">
            <GroupDiagnosisSection providerId={provider.id} scopeLabel="do provedor" />
            <CommonOpportunitiesCard
              providerId={provider.id}
              title={`Problemas mais comuns nos sites de ${provider.name}`}
              description="Oportunidades do Lighthouse que mais se repetem na última coleta das páginas dos canais ativos deste provedor."
              limit={10}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ProviderDialog open={editOpen} onOpenChange={setEditOpen} provider={provider} />

      <ChannelDialog
        open={!!editingChannel}
        onOpenChange={(open) => !open && setEditingChannel(null)}
        channel={editingChannel}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar o provedor {provider.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os {channels.length} canais ligados a ele <strong>não são apagados</strong>: eles ficam sem provedor e
              continuam sendo coletados. Esta ação não pode ser desfeita. Para apagar canais, use a aba Canais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProvider}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar provedor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}
