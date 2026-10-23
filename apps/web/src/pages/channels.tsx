import { useState, useMemo, useEffect } from 'react'
import { Download, Plus } from 'lucide-react'
import type { SortingState } from '@tanstack/react-table'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChannelsTable, type ChannelRow } from '@/components/channels/channels-table'
import { ChannelDialog } from '@/components/channels/channel-dialog'
import {
  ChannelsFilters,
  type ChannelsFiltersState,
} from '@/components/channels/channels-filters'
import { BulkActionsToolbar } from '@/components/channels/bulk-actions-toolbar'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { useChannels } from '@/hooks/use-channels'
import { useProviders } from '@/hooks/use-providers'
import { useAllChannelsMetricsGrouped } from '@/hooks/use-metrics'
import { useSearchState } from '@/hooks/use-search-state'
import { buildChannelSnapshots } from '@/lib/channel-performance'
import { downloadCsv } from '@/lib/csv'
import type { Channel } from '@/types/api'

type ChannelsSearch = {
  q?: string
  theme?: string
  status?: string
  ref?: string
  provider?: string
  sort?: string
}

// Daily rows of the last 30 days feed the score, trend and change columns
const LIST_PERIOD = { range: '30d', granularity: 'daily' } as const

function parseSort(sort: string | undefined): SortingState {
  if (!sort) return []
  const desc = sort.startsWith('-')
  return [{ id: desc ? sort.slice(1) : sort, desc }]
}

function serializeSort(sorting: SortingState): string | undefined {
  const first = sorting[0]
  if (!first) return undefined
  return `${first.desc ? '-' : ''}${first.id}`
}

export function ChannelsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useSearchState<ChannelsSearch>()

  const filters: ChannelsFiltersState = {
    search: search.q ?? '',
    theme: search.theme ?? 'all',
    status: search.status ?? 'all',
    isReference: search.ref ?? 'all',
    provider: search.provider ?? 'all',
  }
  const sorting = parseSort(search.sort)

  const { data, isLoading, isError } = useChannels()
  const { data: providers = [] } = useProviders()
  const grouped = useAllChannelsMetricsGrouped(LIST_PERIOD)

  const snapshots = useMemo(() => buildChannelSnapshots(grouped.data?.all ?? []), [grouped.data])

  const availableThemes = useMemo(() => {
    if (!data) return []
    return Array.from(new Set(data.map((channel) => channel.theme))).sort()
  }, [data])

  const filteredChannels: ChannelRow[] = useMemo(() => {
    if (!data) return []

    return data
      .filter((channel) => {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          const matchesSearch =
            channel.name.toLowerCase().includes(searchLower) ||
            channel.domain.toLowerCase().includes(searchLower)
          if (!matchesSearch) return false
        }
        if (filters.theme !== 'all' && channel.theme !== filters.theme) return false
        if (filters.status !== 'all' && channel.active !== (filters.status === 'active')) return false
        if (filters.isReference !== 'all' && channel.is_reference !== (filters.isReference === 'true')) return false
        if (filters.provider === 'none' && channel.provider_id) return false
        if (filters.provider !== 'all' && filters.provider !== 'none' && channel.provider_id !== filters.provider) {
          return false
        }
        return true
      })
      .map((channel) => ({ ...channel, performance: snapshots.get(channel.id) }))
  }, [data, filters.search, filters.theme, filters.status, filters.isReference, filters.provider, snapshots])

  // A bulk action must only touch channels the user can see
  const filtersKey = `${filters.search}|${filters.theme}|${filters.status}|${filters.isReference}|${filters.provider}`
  useEffect(() => {
    setSelectedIds([])
  }, [filtersKey])

  const handleFiltersChange = (next: ChannelsFiltersState) => {
    setSearch({
      q: next.search || undefined,
      theme: next.theme === 'all' ? undefined : next.theme,
      status: next.status === 'all' ? undefined : next.status,
      ref: next.isReference === 'all' ? undefined : next.isReference,
      provider: next.provider === 'all' ? undefined : next.provider,
    })
  }

  const handleExport = () => {
    downloadCsv(
      `best-lap-canais-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Canal', 'Domínio', 'URL', 'Tema', 'Provedor', 'Status', 'Score 7 dias', 'Variação (pts)', 'LCP (s)', 'CLS'],
      filteredChannels.map((c) => [
        c.name,
        c.domain,
        c.internal_link,
        c.theme,
        c.provider?.name ?? '',
        c.active ? 'Ativo' : 'Inativo',
        c.performance?.score ?? null,
        c.performance?.scoreDelta?.diff ?? null,
        c.performance?.lcp != null ? c.performance.lcp / 1000 : null,
        c.performance?.cls ?? null,
      ])
    )
  }

  const handleEdit = (channel: Channel) => {
    setSelectedChannel(channel)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedChannel(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setSelectedChannel(null)
  }

  if (isError) {
    return (
      <AppShell title="Canais" description="Sites monitorados">
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-destructive">
            Não foi possível carregar os canais. Verifique sua conexão e recarregue a página.
          </p>
        </div>
      </AppShell>
    )
  }

  const hasActiveFilters =
    filters.search || filters.theme !== 'all' || filters.status !== 'all' || filters.isReference !== 'all' || filters.provider !== 'all'

  return (
    <AppShell
      title="Canais"
      description="Sites monitorados e a performance recente de cada um"
      breadcrumbs={[{ label: 'Canais' }]}
      action={
        <>
          <CopyLinkButton />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || filteredChannels.length === 0}>
            <Download />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={isLoading}>
            <Plus />
            Novo canal
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <>
            <ChannelsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              availableThemes={availableThemes}
              availableProviders={providers}
            />

            <p className="text-xs text-muted-foreground">
              Score, LCP e CLS: média da home nos últimos 7 dias. Variação: contra os 7 dias anteriores. Canais inativos não
              têm métricas recentes.
            </p>

            {selectedIds.length > 0 && (
              <BulkActionsToolbar
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds([])}
              />
            )}

            {filteredChannels.length === 0 && !hasActiveFilters ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Nenhum canal cadastrado ainda.</p>
                  <Button variant="link" onClick={handleCreate} className="mt-2">
                    Cadastrar o primeiro canal
                  </Button>
                </div>
              </div>
            ) : (
              <ChannelsTable
                data={filteredChannels}
                onEdit={handleEdit}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                sorting={sorting}
                onSortingChange={(next) => setSearch({ sort: serializeSort(next) })}
                isLoadingMetrics={grouped.isLoading}
              />
            )}
          </>
        )}
      </div>

      <ChannelDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        channel={selectedChannel}
      />
    </AppShell>
  )
}
