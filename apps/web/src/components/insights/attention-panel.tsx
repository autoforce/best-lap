import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const VISIBLE = 6

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

/** What changed and needs a look, worst first. Exceptions before averages. */
export function AttentionPanel({ providerId }: { providerId?: string }) {
  const { data, isLoading, isError } = useAttentionItems(providerId)
  const items = data?.items ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2 space-y-0">
        <CardTitle>Precisa de atenção</CardTitle>
        {!isLoading && !isError && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {items.length === 0 ? 'Nada fora do normal' : `${items.length} ${items.length === 1 ? 'item' : 'itens'}, do mais grave para o menos grave`}
          </span>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 px-6 pb-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Não foi possível carregar os alertas agora.</p>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 px-6 pb-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-good" />
            Nenhuma queda de score, métrica nova na faixa Ruim ou coleta atrasada nos últimos dias.
          </div>
        ) : (
          <ul className="divide-y border-t">
            {items.slice(0, VISIBLE).map((item) => (
              <li key={item.id} className="flex items-stretch gap-4 pr-6">
                <span className={cn('w-1 shrink-0', item.severity === 'poor' ? 'bg-poor' : 'bg-warn')} aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">
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
            {items.length > VISIBLE && (
              <li className="px-6 py-3 text-sm text-muted-foreground">
                E mais {items.length - VISIBLE} {items.length - VISIBLE === 1 ? 'item' : 'itens'} de menor gravidade.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
