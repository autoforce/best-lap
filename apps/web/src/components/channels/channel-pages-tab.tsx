import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Plus, Pencil, Trash2, ExternalLink, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageDialog } from './page-dialog'
import { usePages, useDeletePage } from '@/hooks/use-pages'
import { useToast } from '@/hooks/use-toast'
import type { Page, Channel } from '@/types/api'
import { TriggerCollectionDialog } from '@/components/trigger-collection-dialog'
import { useChannelPagesMetrics, useTriggerCollectionPage } from '@/hooks/use-metrics'
import { buildChannelSnapshots } from '@/lib/channel-performance'
import { formatMetric, rateMetric } from '@/lib/metrics'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { DeltaBadge } from '@/components/metrics/delta-badge'
import { Sparkline } from '@/components/metrics/sparkline'

// Daily rows of the last 30 days feed the score, trend and change of each page
const LIST_PERIOD = { range: '30d', granularity: 'daily' } as const

interface ChannelPagesTabProps {
  channel: Channel
}

export function ChannelPagesTab({ channel }: ChannelPagesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)

  const { toast } = useToast()
  const { data: pages, isLoading } = usePages(channel.id)
  const deletePage = useDeletePage()
  const { mutate: triggerCollectionPage, isPending: isCollecting } =
    useTriggerCollectionPage()
  const pagesMetrics = useChannelPagesMetrics(channel.id, LIST_PERIOD)

  // Same snapshot as the channel list, keyed by page instead of channel
  const snapshots = useMemo(
    () =>
      buildChannelSnapshots(
        (pagesMetrics.data?.all ?? []).map((row) => ({ ...row, channel_id: row.page_id, channel_name: row.page_name }))
      ),
    [pagesMetrics.data]
  )

  const handleCreate = () => {
    setSelectedPage(null)
    setDialogOpen(true)
  }

  const handleEdit = (page: Page) => {
    setSelectedPage(page)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!pageToDelete) return

    try {
      await deletePage.mutateAsync({
        channelId: channel.id,
        pageId: pageToDelete.id,
      })
      toast({
        title: 'Página deletada',
        description: 'A página foi deletada com sucesso.',
      })
      setDeleteDialogOpen(false)
      setPageToDelete(null)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao deletar a página.',
        variant: 'destructive',
      })
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setSelectedPage(null)
    }
  }

  // internal_link carries the protocol; domain may not, which produced relative links
  const getFullUrl = (path: string) => {
    const base = channel.internal_link.replace(/\/+$/, '')
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${base}${cleanPath}`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Páginas do canal</h3>
            <p className="text-sm text-muted-foreground">
              Todas são medidas a cada coleta agendada. Score e LCP: média dos últimos 7 dias; variação contra os 7
              dias anteriores.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Página
          </Button>
        </div>

        {!pages || pages.length === 0 ? (
          <Card>
            <CardContent className="flex h-[200px] items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma página cadastrada ainda.
                </p>
                <Button
                  variant="link"
                  onClick={handleCreate}
                  className="mt-2"
                >
                  Criar sua primeira página
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {pages.length} página{pages.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Página</TableHead>
                    <TableHead>Score 7d</TableHead>
                    <TableHead>30 dias</TableHead>
                    <TableHead>Variação</TableHead>
                    <TableHead>LCP</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => {
                    const snapshot = snapshots.get(page.id)
                    const placeholder = pagesMetrics.isLoading ? '…' : '—'
                    return (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div className="min-w-[180px]">
                          <p className="font-medium">{page.name}</p>
                          <a
                            href={getFullUrl(page.path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <code>{page.path}</code>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        {snapshot?.score != null ? (
                          <RatingBadge rating={rateMetric('score', snapshot.score)} className="text-sm">
                            {formatMetric('score', snapshot.score)}
                          </RatingBadge>
                        ) : (
                          <span className="text-muted-foreground">{placeholder}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Sparkline
                          values={snapshot?.trend ?? []}
                          tone={snapshot?.scoreDelta?.improved === false ? 'poor' : snapshot?.scoreDelta?.improved ? 'good' : 'neutral'}
                        />
                      </TableCell>
                      <TableCell>
                        <DeltaBadge delta={snapshot?.scoreDelta ?? null} />
                      </TableCell>
                      <TableCell>
                        {snapshot?.lcp != null ? (
                          <RatingBadge rating={rateMetric('lcp', snapshot.lcp)}>{formatMetric('lcp', snapshot.lcp)}</RatingBadge>
                        ) : (
                          <span className="text-muted-foreground">{placeholder}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                            <Link to="/channels/$channelId" params={{ channelId: channel.id }} search={{ page: page.id } as never}>
                              Performance
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                            <Link
                              to="/channels/$channelId"
                              params={{ channelId: channel.id }}
                              search={{ tab: 'fix', page: page.id } as never}
                            >
                              O que corrigir
                            </Link>
                          </Button>
                          <TriggerCollectionDialog
                            scope="page"
                            pageName={page.name}
                            onConfirm={() =>
                              triggerCollectionPage({
                                channelId: channel.id,
                                pageId: page.id,
                              })
                            }
                            isPending={isCollecting}
                          >
                            <Button variant="ghost" size="sm" title="Coletar agora esta página" aria-label={`Coletar agora ${page.name}`}>
                              <Activity className="h-4 w-4" />
                            </Button>
                          </TriggerCollectionDialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(page)}
                            title="Editar página"
                            aria-label={`Editar ${page.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPageToDelete(page)
                              setDeleteDialogOpen(true)
                            }}
                            title="Deletar página"
                            aria-label={`Deletar ${page.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PageDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        channelId={channel.id}
        page={selectedPage}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente
              a página <strong>{pageToDelete?.name}</strong> e todas as métricas
              associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
