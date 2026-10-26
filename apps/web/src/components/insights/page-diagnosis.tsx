import { useMemo, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, Minus, X } from 'lucide-react'
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
import { Sparkline } from '@/components/metrics/sparkline'
import { RecommendationsList } from '@/components/insights/recommendations-list'
import { usePageDiagnosis } from '@/hooks/use-insights'
import {
  TYPE_COLORS,
  TYPE_LABELS,
  TYPE_ORDER,
  auditShortLabel,
  categoryLabel,
  formatBytes,
  formatDay,
  formatMs,
} from '@/lib/diagnosis'
import { cn } from '@/lib/utils'
import type { PageSnapshot, PageWeightPoint, SnapshotChange, SnapshotLcp, SnapshotResource } from '@/types/api'

const DIRECTION_ICON = {
  worse: { icon: ArrowUpRight, className: 'text-poor', label: 'Piorou' },
  better: { icon: ArrowDownRight, className: 'text-good', label: 'Melhorou' },
  neutral: { icon: Minus, className: 'text-muted-foreground', label: 'Mudou' },
}

function ChangesCard({ changes, previousDay }: { changes: SnapshotChange[]; previousDay?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">O que mudou</CardTitle>
        <p className="text-sm text-muted-foreground">
          {previousDay ? `Comparado com o retrato de ${formatDay(previousDay)}.` : 'A comparação aparece depois do segundo dia de coleta.'}
        </p>
      </CardHeader>
      <CardContent>
        {!previousDay ? null : changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada relevante mudou: mesmo peso, mesmos terceiros e o mesmo elemento principal.</p>
        ) : (
          <ul className="space-y-3">
            {changes.map((change, i) => {
              const { icon: Icon, className, label } = DIRECTION_ICON[change.direction]
              return (
                <li key={`${change.kind}-${i}`} className="flex gap-2 text-sm">
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', className)} aria-label={label} />
                  <div className="min-w-0">
                    <p className="font-medium">{change.title}</p>
                    {change.detail && <p className="break-all text-xs text-muted-foreground">{change.detail}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function WeightCard({ snapshot, history }: { snapshot: PageSnapshot; history: PageWeightPoint[] }) {
  const total = snapshot.total_bytes ?? 0
  const types = TYPE_ORDER.filter((type) => (snapshot.bytes_by_type[type] ?? 0) > 0)
  const trend = history.map((point) => (point.total_bytes ?? 0) / 1024 / 1024)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Peso da página</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <p>
            <span className="text-3xl font-bold tabular-nums">{formatBytes(total)}</span>
            <span className="block text-xs text-muted-foreground">{snapshot.request_count ?? '—'} requisições</span>
          </p>
          {trend.length >= 2 && (
            <div className="text-right">
              <Sparkline values={trend} label={`Peso nos últimos ${trend.length} dias`} />
              <span className="block text-xs text-muted-foreground">{trend.length} dias</span>
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {types.map((type) => (
              <span
                key={type}
                style={{ width: `${(snapshot.bytes_by_type[type] / total) * 100}%`, background: TYPE_COLORS[type] }}
              />
            ))}
          </div>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {types.map((type) => (
            <div key={type} className="flex items-center justify-between gap-2 whitespace-nowrap">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLORS[type] }} aria-hidden="true" />
                {TYPE_LABELS[type] ?? type}
              </dt>
              <dd className="tabular-nums">{formatBytes(snapshot.bytes_by_type[type])}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

const LCP_PHASES: Array<{ key: keyof SnapshotLcp; label: string; color: string }> = [
  { key: 'ttfb_ms', label: 'Resposta do servidor', color: 'hsl(var(--chart-5))' },
  { key: 'load_delay_ms', label: 'Espera para começar a baixar', color: 'hsl(var(--chart-2))' },
  { key: 'load_duration_ms', label: 'Download', color: 'hsl(var(--chart-1))' },
  { key: 'render_delay_ms', label: 'Espera para aparecer', color: 'hsl(var(--chart-4))' },
]

function Flag({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <Check className="h-4 w-4 text-good" aria-label="Ok" /> : <X className="h-4 w-4 text-poor" aria-label="Falhou" />}
      {children}
    </li>
  )
}

function LcpCard({ lcp }: { lcp: SnapshotLcp | null }) {
  const phases = LCP_PHASES.map((phase) => ({ ...phase, value: (lcp?.[phase.key] as number | undefined) ?? 0 }))
  const total = phases.reduce((sum, phase) => sum + phase.value, 0)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Elemento principal (LCP)</CardTitle>
        <p className="text-sm text-muted-foreground">O maior elemento da primeira tela, e onde o tempo dele vai.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!lcp ? (
          <p className="text-sm text-muted-foreground">O Lighthouse não identificou o elemento nesta coleta.</p>
        ) : (
          <>
            <div className="min-w-0 space-y-1">
              <p className="font-medium">
                {lcp.label || 'Sem rótulo'}{' '}
                <span className="text-xs font-normal text-muted-foreground">{lcp.is_image ? '· imagem' : '· texto ou bloco'}</span>
              </p>
              {lcp.selector && <code className="block break-all text-xs text-muted-foreground">{lcp.selector}</code>}
            </div>
            {total > 0 && (
              <div className="space-y-2">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  {phases.map((phase) => (
                    <span key={phase.key} style={{ width: `${(phase.value / total) * 100}%`, background: phase.color }} />
                  ))}
                </div>
                <dl className="space-y-1 text-sm">
                  {phases.map((phase) => (
                    <div key={phase.key} className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ background: phase.color }} aria-hidden="true" />
                        {phase.label}
                      </dt>
                      <dd className="tabular-nums">{formatMs(phase.value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {lcp.is_image && (
              <ul className="space-y-1 border-t pt-3">
                {lcp.lazy_loaded !== undefined && <Flag ok={!lcp.lazy_loaded}>Sem loading="lazy"</Flag>}
                {lcp.priority_hinted !== undefined && <Flag ok={lcp.priority_hinted}>Com fetchpriority="high"</Flag>}
                {lcp.discoverable !== undefined && <Flag ok={lcp.discoverable}>Presente no HTML inicial</Flag>}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ThirdPartiesCard({ snapshot }: { snapshot: PageSnapshot }) {
  const tags = snapshot.third_parties.filter((t) => !t.own)
  const own = snapshot.third_parties.filter((t) => t.own)
  const tagsMs = tags.reduce((sum, t) => sum + t.main_thread_ms, 0)
  const tagsBytes = tags.reduce((sum, t) => sum + t.bytes, 0)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Scripts de terceiros</CardTitle>
        <p className="text-sm text-muted-foreground">
          {tags.length} terceiros · {formatMs(tagsMs)} de processamento · {formatBytes(tagsBytes)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quem</TableHead>
                <TableHead className="text-right">Processamento</TableHead>
                <TableHead className="text-right">Peso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...tags.slice(0, 8), ...own].map((t) => (
                <TableRow key={t.entity} className={cn(t.own && 'text-muted-foreground')}>
                  <TableCell>
                    <span className="block font-medium">{t.entity}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.own ? 'Site ou plataforma' : categoryLabel(t.category)}
                      {t.requests > 1 && ` · ${t.requests} arquivos`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMs(t.main_thread_ms)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatBytes(t.bytes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/** The same file can be flagged by several audits: one row per file, with every reason */
function groupResources(resources: SnapshotResource[]) {
  const byKey = new Map<string, SnapshotResource & { audits: string[] }>()
  for (const r of resources) {
    const existing = byKey.get(r.key)
    if (!existing) {
      byKey.set(r.key, { ...r, audits: [r.audit] })
      continue
    }
    existing.audits.push(r.audit)
    existing.wasted_ms = Math.max(existing.wasted_ms ?? 0, r.wasted_ms ?? 0) || undefined
    existing.wasted_bytes = Math.max(existing.wasted_bytes ?? 0, r.wasted_bytes ?? 0) || undefined
    existing.total_bytes = Math.max(existing.total_bytes ?? 0, r.total_bytes ?? 0) || undefined
    existing.count = Math.max(existing.count ?? 1, r.count ?? 1)
  }
  return [...byKey.values()].sort(
    (a, b) =>
      (b.wasted_ms ?? 0) - (a.wasted_ms ?? 0) ||
      (b.wasted_bytes ?? 0) - (a.wasted_bytes ?? 0) ||
      (b.total_bytes ?? 0) - (a.total_bytes ?? 0)
  )
}

function ResourcesCard({ resources }: { resources: SnapshotResource[] }) {
  const rows = useMemo(() => groupResources(resources).slice(0, 12), [resources])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Arquivos que mais pesam</CardTitle>
        <p className="text-sm text-muted-foreground">
          Endereço sem parâmetros; trechos variáveis do nome aparecem como *. O custo é a maior economia estimada entre os motivos.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo apontado nesta coleta.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead>De quem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="max-w-[420px]">
                      <span className="block break-all text-xs">{r.key}</span>
                      {r.count && r.count > 1 && <span className="text-xs text-muted-foreground">carregado {r.count} vezes</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.audits.map(auditShortLabel).join(', ')}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                      {r.wasted_ms ? formatMs(r.wasted_ms) : r.wasted_bytes ? formatBytes(r.wasted_bytes) : formatBytes(r.total_bytes)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.own ? 'secondary' : 'outline'} className="whitespace-nowrap font-normal">
                        {r.own ? 'Site ou plataforma' : r.entity ?? 'Terceiro'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Rule-based diagnosis of one page: what weighs, who fixes it and what changed in the last week.
 * Built from the daily snapshot kept for 60 days, no AI involved.
 */
export function PageDiagnosisSection({ pageId }: { pageId: string }) {
  const { data, isLoading, isError } = usePageDiagnosis(pageId)

  if (isLoading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar o diagnóstico. Recarregue a página.</p>
  }

  const current = data?.current
  if (!data || !current) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          O diagnóstico desta página começa na próxima coleta. A partir daí, o Best Lap guarda um retrato por dia, por 60 dias, para
          mostrar o que mudou.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Diagnóstico</CardTitle>
            <p className="text-sm text-muted-foreground">
              Regras aplicadas ao retrato de {formatDay(current.day)}, do maior para o menor impacto. Cada item diz quem costuma
              corrigir.
            </p>
          </CardHeader>
          <CardContent>
            <RecommendationsList
              items={data.recommendations}
              emptyText="Nenhuma regra disparou: imagem principal, terceiros, peso e servidor estão dentro do esperado."
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <ChangesCard changes={data.changes} previousDay={data.previous?.day} />
          <WeightCard snapshot={current} history={data.history} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LcpCard lcp={current.lcp} />
        <ThirdPartiesCard snapshot={current} />
      </div>

      <ResourcesCard resources={current.resources} />
    </div>
  )
}
