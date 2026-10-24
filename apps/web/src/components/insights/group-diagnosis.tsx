import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RecommendationsList } from '@/components/insights/recommendations-list'
import { useGroupDiagnosis } from '@/hooks/use-insights'
import { auditShortLabel, categoryLabel, formatBytes, formatMs } from '@/lib/diagnosis'
import type { GroupDiagnosis } from '@/types/api'

/** A file is "from the template" when it shows up in most sites of the group */
const COMMON_SHARE = 0.6

function ShareBar({ count, total }: { count: number; total: number }) {
  const share = total ? count / total : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-primary" style={{ width: `${share * 100}%` }} />
      </div>
      <span className="whitespace-nowrap text-sm tabular-nums">
        {count} de {total}
      </span>
    </div>
  )
}

function Summary({ data }: { data: GroupDiagnosis }) {
  const n = data.channels_with_data
  const stats = [
    { label: 'Peso médio da home', value: formatBytes(data.weight.avg_total_bytes) },
    { label: 'Terceiros (processamento médio)', value: formatMs(data.weight.avg_third_party_ms) },
    { label: 'Imagem principal com lazy load', value: `${data.lcp.lazy_loaded} de ${n}` },
    { label: 'Imagem principal sem prioridade', value: `${data.lcp.missing_priority_hint} de ${data.lcp.image}` },
  ]
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</dt>
          <dd className="text-xl font-bold tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

interface GroupDiagnosisSectionProps {
  theme?: string
  providerId?: string
  /** "do tema", "do provedor": completes the titles */
  scopeLabel: string
}

/**
 * What repeats across the active sites of a theme or provider, from the latest daily snapshot
 * of each home: shared files, common third parties, LCP patterns and the group rules.
 */
export function GroupDiagnosisSection({ theme, providerId, scopeLabel }: GroupDiagnosisSectionProps) {
  const { data, isLoading, isError } = useGroupDiagnosis({ theme, providerId })

  if (isLoading) return <Skeleton className="h-[360px] w-full" />
  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar o diagnóstico {scopeLabel} agora.</p>
  }

  const n = data.channels_with_data
  if (n === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          O diagnóstico {scopeLabel} aparece depois da próxima coleta: ele usa o retrato diário da home de cada site ativo.
        </CardContent>
      </Card>
    )
  }

  const resources = data.resources.slice(0, 10)
  const thirdParties = data.third_parties.slice(0, 10)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Diagnóstico {scopeLabel}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Retrato mais recente da home de {n} {n === 1 ? 'site ativo' : 'sites ativos'}. O que se repete na maioria costuma ser
              corrigido uma vez, no template ou num padrão de tags.
            </p>
          </div>
          <Summary data={data} />
        </CardHeader>
        <CardContent>
          <RecommendationsList
            items={data.recommendations}
            emptyText={
              n < 3
                ? 'As regras de grupo precisam de pelo menos 3 sites com retrato.'
                : 'Nenhum padrão se repete o bastante para virar recomendação de grupo.'
            }
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Arquivos em comum</CardTitle>
            <p className="text-sm text-muted-foreground">
              Arquivos apontados pelo Lighthouse em 2 sites ou mais. Em {Math.round(COMMON_SHARE * 100)}% dos sites ou mais, a correção
              provavelmente é uma só.
            </p>
          </CardHeader>
          <CardContent>
            {resources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum arquivo se repete entre os sites.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead className="text-right">Custo médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell className="max-w-[360px]">
                          <span className="block break-all text-xs">{r.key}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant={r.own ? 'secondary' : 'outline'} className="font-normal">
                              {r.own ? (n && r.channels / n >= COMMON_SHARE ? 'Template' : 'Site ou plataforma') : r.entity ?? 'Terceiro'}
                            </Badge>
                            {r.audits.map(auditShortLabel).join(', ')}
                          </span>
                          <span className="mt-1 block text-xs">
                            {r.top_channels.slice(0, 3).map((c, i) => (
                              <span key={c.id}>
                                {i > 0 && ', '}
                                <Link to="/channels/$channelId" params={{ channelId: c.id }} search={{ tab: 'fix' } as never} className="text-primary hover:underline">
                                  {c.name}
                                </Link>
                              </span>
                            ))}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ShareBar count={r.channels} total={n} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                          {r.avg_wasted_ms ? formatMs(r.avg_wasted_ms) : r.avg_wasted_bytes ? formatBytes(r.avg_wasted_bytes) : formatBytes(r.avg_total_bytes)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Terceiros mais comuns</CardTitle>
            <p className="text-sm text-muted-foreground">Tags e widgets instalados nos sites, com o custo médio onde aparecem.</p>
          </CardHeader>
          <CardContent>
            {thirdParties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum terceiro encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quem</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead className="text-right">Processamento</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thirdParties.map((t) => (
                      <TableRow key={t.entity}>
                        <TableCell>
                          <span className="block font-medium">{t.entity}</span>
                          <span className="block text-xs text-muted-foreground">{categoryLabel(t.category)}</span>
                        </TableCell>
                        <TableCell>
                          <ShareBar count={t.channels} total={n} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatMs(t.avg_main_thread_ms)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatBytes(t.avg_bytes)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
