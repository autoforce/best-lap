import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCommonOpportunities } from '@/hooks/use-insights'
import { auditHint, auditTitle, formatSavings } from '@/lib/lighthouse-audits'

interface CommonOpportunitiesCardProps {
  theme?: string
  providerId?: string
  title?: string
  description?: string
  limit?: number
}

/**
 * Problems shared by many sites. When most sites of a theme fail the same audit,
 * fixing it once in the template fixes all of them.
 */
export function CommonOpportunitiesCard({
  theme,
  providerId,
  title = 'Problemas mais comuns',
  description,
  limit = 6,
}: CommonOpportunitiesCardProps) {
  const { data, isLoading, isError } = useCommonOpportunities({ theme, providerId })
  const items = data?.items.slice(0, limit) ?? []
  const total = data?.channels_with_data ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {description ??
            'Oportunidades do Lighthouse que mais se repetem na última coleta de cada página. Quanto mais sites afetados, maior a chance de a correção ser no tema.'}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar as oportunidades agora.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há oportunidades registradas. Elas aparecem a partir da próxima coleta de cada página.
          </p>
        ) : (
          <ol className="divide-y">
            {items.map((item) => {
              const share = total ? item.channels_affected / total : 0
              return (
                <li key={item.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-6">
                  <div className="min-w-0">
                    <p className="font-medium">{auditTitle(item.id, item.title)}</p>
                    <p className="text-sm text-muted-foreground">{auditHint(item.id, item.description)}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Maior ganho em:</span>
                      {item.top_channels.slice(0, 3).map((c) => (
                        <Link
                          key={c.id}
                          to="/channels/$channelId"
                          params={{ channelId: c.id }}
                          search={{ tab: 'fix' } as never}
                          className="text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </p>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {item.channels_affected} de {total} sites
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} />
                    </div>
                    {item.avg_savings_ms ? (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Média {formatSavings(item.avg_savings_ms, item.avg_savings_bytes)} por página
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
