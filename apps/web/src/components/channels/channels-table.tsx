import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type Column,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import type { Channel } from '@/types/api'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react'
import {
  useDeleteChannel,
  useEnableChannel,
  useDisableChannel,
} from '@/hooks/use-channels'
import { useToast } from '@/hooks/use-toast'
import { formatMetric, rateMetric } from '@/lib/metrics'
import type { ChannelPerformanceSnapshot } from '@/lib/channel-performance'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { DeltaBadge } from '@/components/metrics/delta-badge'
import { Sparkline } from '@/components/metrics/sparkline'
import { MetricInfo } from '@/components/metrics/metric-info'

export type ChannelRow = Channel & { performance?: ChannelPerformanceSnapshot }

interface ChannelsTableProps {
  data: ChannelRow[]
  onEdit: (channel: Channel) => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  isLoadingMetrics?: boolean
}

function SortHeader({ column, label }: { column: Column<ChannelRow, unknown>; label: string }) {
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {label}
      <Icon className="ml-1 h-3.5 w-3.5" />
    </Button>
  )
}

export function ChannelsTable({
  data,
  onEdit,
  selectedIds,
  onSelectionChange,
  sorting,
  onSortingChange,
  isLoadingMetrics,
}: ChannelsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null)

  const { toast } = useToast()
  const deleteChannel = useDeleteChannel()
  const enableChannel = useEnableChannel()
  const disableChannel = useDisableChannel()

  const rowSelection: RowSelectionState = Object.fromEntries(selectedIds.map((id) => [id, true]))

  const handleDelete = async (channel: Channel) => {
    try {
      await deleteChannel.mutateAsync(channel.id)
      toast({
        title: 'Canal deletado',
        description: `${channel.name} e o histórico de métricas foram removidos.`,
      })
      setDeleteDialogOpen(false)
      setChannelToDelete(null)
      onSelectionChange(selectedIds.filter((id) => id !== channel.id))
    } catch (error) {
      toast({
        title: 'Não foi possível deletar',
        description: 'Tente novamente. Se persistir, verifique se a API está no ar.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (channel: Channel) => {
    try {
      if (channel.active) {
        await disableChannel.mutateAsync(channel.id)
        toast({
          title: 'Canal desativado',
          description: `${channel.name} sai das próximas coletas.`,
        })
      } else {
        await enableChannel.mutateAsync(channel.id)
        toast({
          title: 'Canal ativado',
          description: `${channel.name} entra na próxima coleta.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Não foi possível alterar o status',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    }
  }

  const metricPlaceholder = isLoadingMetrics ? '…' : '—'

  const columns: ColumnDef<ChannelRow>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Selecionar todos desta página"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Selecionar ${row.original.name}`}
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortHeader column={column} label="Canal" />,
      cell: ({ row }) => (
        <Link
          to="/channels/$channelId"
          params={{ channelId: row.original.id }}
          className="block min-w-[180px] max-w-[260px] hover:underline"
        >
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{row.original.name}</span>
            {!row.original.active && (
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                Inativo
              </Badge>
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{row.original.domain}</span>
        </Link>
      ),
    },
    {
      id: 'score',
      accessorFn: (row) => row.performance?.score ?? undefined,
      sortUndefined: 'last',
      header: ({ column }) => (
        <div className="flex items-center">
          <SortHeader column={column} label="Score 7d" />
          <MetricInfo metric="score" />
        </div>
      ),
      cell: ({ row }) => {
        const score = row.original.performance?.score ?? null
        return score === null ? (
          <span className="text-muted-foreground">{metricPlaceholder}</span>
        ) : (
          <RatingBadge rating={rateMetric('score', score)} className="text-sm">
            {formatMetric('score', score)}
          </RatingBadge>
        )
      },
    },
    {
      id: 'trend',
      header: '30 dias',
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original.performance
        if (!p) return <span className="text-muted-foreground">{metricPlaceholder}</span>
        const tone = p.scoreDelta?.improved === false ? 'poor' : p.scoreDelta?.improved ? 'good' : 'neutral'
        return <Sparkline values={p.trend} tone={tone} label={`Score dos últimos 30 dias de ${row.original.name}`} />
      },
    },
    {
      id: 'delta',
      accessorFn: (row) => row.performance?.scoreDelta?.diff ?? undefined,
      sortUndefined: 'last',
      header: ({ column }) => <SortHeader column={column} label="Variação" />,
      cell: ({ row }) => {
        const delta = row.original.performance?.scoreDelta ?? null
        return delta ? (
          <DeltaBadge delta={delta} />
        ) : (
          <span className="text-muted-foreground">{metricPlaceholder}</span>
        )
      },
    },
    {
      id: 'lcp',
      accessorFn: (row) => row.performance?.lcp ?? undefined,
      sortUndefined: 'last',
      header: ({ column }) => <SortHeader column={column} label="LCP" />,
      cell: ({ row }) => {
        const lcp = row.original.performance?.lcp ?? null
        return lcp === null ? (
          <span className="text-muted-foreground">{metricPlaceholder}</span>
        ) : (
          <RatingBadge rating={rateMetric('lcp', lcp)}>{formatMetric('lcp', lcp)}</RatingBadge>
        )
      },
    },
    {
      id: 'cls',
      accessorFn: (row) => row.performance?.cls ?? undefined,
      sortUndefined: 'last',
      header: ({ column }) => <SortHeader column={column} label="CLS" />,
      cell: ({ row }) => {
        const cls = row.original.performance?.cls ?? null
        return cls === null ? (
          <span className="text-muted-foreground">{metricPlaceholder}</span>
        ) : (
          <RatingBadge rating={rateMetric('cls', cls)}>{formatMetric('cls', cls)}</RatingBadge>
        )
      },
    },
    {
      accessorKey: 'theme',
      header: ({ column }) => <SortHeader column={column} label="Tema" />,
      cell: ({ row }) => <Badge variant="outline">{row.original.theme}</Badge>,
    },
    {
      id: 'provider',
      accessorFn: (row) => row.provider?.name ?? '',
      header: 'Provedor',
      cell: ({ row }) =>
        row.original.provider ? (
          <Link to="/providers/$providerId" params={{ providerId: row.original.provider.id }}>
            <Badge variant="secondary" className="whitespace-nowrap hover:bg-secondary/60">
              {row.original.provider.name}
            </Badge>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => {
        const channel = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 data-[state=open]:bg-muted">
                <span className="sr-only">Ações de {channel.name}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{channel.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/channels/$channelId" params={{ channelId: channel.id }}>
                  Abrir performance
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(channel)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(channel)}>
                <Power className="mr-2 h-4 w-4" />
                {channel.active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setChannelToDelete(channel)
                  setDeleteDialogOpen(true)
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    // Selection is keyed by channel id, so it never points to another channel after filtering or sorting
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater),
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater
      onSelectionChange(Object.keys(next).filter((id) => next[id]))
    },
    initialState: { pagination: { pageSize: 25 } },
    state: {
      sorting,
      rowSelection,
    },
  })

  const { pageIndex } = table.getState().pagination

  return (
    <>
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    Nenhum canal com estes filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground tabular-nums">
            {selectedIds.length > 0
              ? `${selectedIds.length} de ${data.length} selecionado(s)`
              : `${data.length} canal(is)`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">
              Página {pageIndex + 1} de {Math.max(1, table.getPageCount())}
            </span>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Próxima
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar {channelToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O canal, as páginas e todo o histórico de métricas serão apagados.
              Para só parar de coletar, use Desativar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => channelToDelete && handleDelete(channelToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar canal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
