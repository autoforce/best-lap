import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttentionItems } from '@/hooks/use-insights'
import { cn } from '@/lib/utils'
import type { AttentionItem } from '@/types/api'

const ACTION_LABEL: Record<AttentionItem['kind'], string> = {
  theme_regression: 'Ver o tema',
  regression: 'Ver o que mudou',
  entered_poor: 'Abrir o canal',
  stale: 'Abrir o canal',
  no_home: 'Cadastrar a home',
}

const PAGE_SIZE = 30

function ItemLink({ item }: { item: AttentionItem }) {
  const className = 'whitespace-nowrap text-sm font-medium text-primary hover:underline'
  if (item.channel_id) {
    return (
      <Link
        to="/channels/$channelId"
        params={{ channelId: item.channel_id }}
        search={(item.kind === 'no_home' ? { tab: 'pages' } : item.metric && item.metric !== 'score' ? { metric: item.metric } : {}) as never}
        className={className}
      >
        {ACTION_LABEL[item.kind]} →
      </Link>
    )
  }
  if (item.theme) {
    return (
      <Link to="/themes/$theme" params={{ theme: item.theme }} className={className}>
        {ACTION_LABEL[item.kind]} →
      </Link>
    )
  }
  return null
}

function AttentionList({ items }: { items: AttentionItem[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  return (
    <ul className="divide-y rounded-md border">
      {items.slice(0, visible).map((item) => (
        <li key={item.id} className="flex items-stretch gap-3 pr-4">
          <span className={cn('w-1 shrink-0', item.severity === 'poor' ? 'bg-poor' : 'bg-warn')} aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                <span className="sr-only">{item.severity === 'poor' ? 'Grave: ' : 'Atenção: '}</span>
                {item.title}
              </p>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
              {item.channels && item.channels.length > 0 && (
                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {item.channels.slice(0, 8).map((c) => (
                    <Link key={c.id} to="/channels/$channelId" params={{ channelId: c.id }} className="text-primary hover:underline">
                      {c.name}
                    </Link>
                  ))}
                  {item.channels.length > 8 && <span className="text-muted-foreground">+{item.channels.length - 8}</span>}
                </p>
              )}
            </div>
            <ItemLink item={item} />
          </div>
        </li>
      ))}
      {items.length > visible && (
        <li className="p-2 text-center">
          <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Mostrar mais {Math.min(PAGE_SIZE, items.length - visible)} de {items.length - visible}
          </Button>
        </li>
      )}
    </ul>
  )
}

/**
 * Small, low-key entry point for the attention items: a button with the count that opens
 * the full list on demand, so the data stays first on the screen.
 */
export function AttentionSummary({ providerId }: { providerId?: string }) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useAttentionItems(providerId)
  const items = data?.items ?? []
  const critical = items.filter((i) => i.severity === 'poor').length

  if (isError) return null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isLoading}
        aria-label={isLoading ? 'Verificando alertas' : `Alertas: ${items.length}`}
      >
        {items.length === 0 && !isLoading ? <CheckCircle2 className="text-good" /> : <Bell />}
        {isLoading ? (
          'Alertas…'
        ) : items.length === 0 ? (
          'Sem alertas'
        ) : (
          <>
            <span className="tabular-nums">{items.length} alertas</span>
            {critical > 0 && <span className="font-normal text-muted-foreground tabular-nums">· {critical} graves</span>}
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alertas</DialogTitle>
            <DialogDescription>
              Quedas de score, métricas que entraram na faixa Ruim e coletas atrasadas, do mais grave para o menos grave.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-good" />
              Nenhuma queda de score, métrica nova na faixa Ruim ou coleta atrasada nos últimos dias.
            </div>
          ) : (
            <AttentionList items={items} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
