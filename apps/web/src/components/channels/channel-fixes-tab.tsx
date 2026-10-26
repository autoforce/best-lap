import { format, formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FindingsList } from '@/components/insights/findings-list'
import { PageDiagnosisSection } from '@/components/insights/page-diagnosis'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { useChannelInsights } from '@/hooks/use-insights'
import { useSearchState } from '@/hooks/use-search-state'
import { formatMetric, rateMetric, type MetricKey, type Rating } from '@/lib/metrics'
import type { Channel, FieldData } from '@/types/api'

// INP is a field-only metric, so it has no entry in the lab metric definitions
const rateInp = (ms: number): Rating => (ms <= 200 ? 'good' : ms > 500 ? 'poor' : 'warn')

function FieldDataCard({ data }: { data: FieldData }) {
  const rows: Array<{ label: string; value?: number; metric?: MetricKey; inp?: boolean }> = [
    { label: 'LCP', value: data.lcp_ms, metric: 'lcp' },
    { label: 'INP', value: data.inp_ms, inp: true },
    { label: 'CLS', value: data.cls, metric: 'cls' },
    { label: 'FCP', value: data.fcp_ms, metric: 'fcp' },
    { label: 'TTFB', value: data.ttfb_ms, metric: 'response_time' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usuários reais (Chrome UX Report)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Percentil 75 dos últimos 28 dias, medido em navegadores de verdade. É o dado que o Google usa no ranking.
          {data.origin_fallback && ' Sem dados suficientes desta página: valores do site inteiro.'}
        </p>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {rows
            .filter((row) => row.value !== undefined)
            .map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 text-sm">
                <dt className="font-medium">{row.label}</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {row.inp ? `${Math.round(row.value!)} ms` : formatMetric(row.metric!, row.value!)}
                  </span>
                  <RatingBadge rating={row.inp ? rateInp(row.value!) : rateMetric(row.metric!, row.value!)} compact />
                </dd>
              </div>
            ))}
        </dl>
      </CardContent>
    </Card>
  )
}

/** "What to fix": Lighthouse opportunities and diagnostics of the latest collection of each page */
export function ChannelFixesTab({ channel }: { channel: Channel }) {
  const { data: pages = [], isLoading, isError } = useChannelInsights(channel.id)
  const [search, setSearch] = useSearchState<{ page?: string }>()

  const home = pages.find((p) => p.page_path === '/')
  const selected = pages.find((p) => p.page_id === search.page) ?? home ?? pages[0]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">Não foi possível carregar as recomendações. Recarregue a página.</p>
  }

  if (!selected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Wrench className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">Ainda não há recomendações para este canal</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Elas são geradas a cada coleta. Use “Coletar Performance” no topo da página ou aguarde a próxima coleta
            agendada.
          </p>
        </CardContent>
      </Card>
    )
  }

  const collectedAt = new Date(selected.collected_at)
  const totalSavings = selected.opportunities.reduce((sum, f) => Math.max(sum, f.savings_ms ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <label htmlFor="fix-page" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Página
          </label>
          <Select
            value={selected.page_id}
            onValueChange={(page) => setSearch({ page: page === home?.page_id ? undefined : page })}
          >
            <SelectTrigger id="fix-page" className="w-full sm:w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page.page_id} value={page.page_id}>
                  {page.page_name} ({page.page_path})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right">
          Coleta de {format(collectedAt, "dd/MM 'às' HH:mm")} (há {formatDistanceToNowStrict(collectedAt, { locale: ptBR })})
          {selected.lighthouse_version && ` · Lighthouse ${selected.lighthouse_version}`} · celular
        </p>
      </div>

      <PageDiagnosisSection pageId={selected.page_id} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Oportunidades do Lighthouse</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ordenado pela economia estimada.
                {totalSavings > 0 &&
                  ` A maior oportunidade pode tirar até ${(totalSavings / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s do carregamento.`}{' '}
                As economias não se somam: várias mexem no mesmo tempo.
              </p>
            </CardHeader>
            <CardContent>
              <FindingsList
                findings={selected.opportunities}
                emptyText="Nenhuma oportunidade com economia estimada nesta coleta."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outros diagnósticos</CardTitle>
              <p className="text-sm text-muted-foreground">Itens que o Lighthouse reprovou, sem economia estimada.</p>
            </CardHeader>
            <CardContent>
              <FindingsList
                findings={selected.diagnostics}
                emptyText="Nenhum outro diagnóstico reprovado."
                showSavings={false}
              />
            </CardContent>
          </Card>
        </div>

        {selected.field_data ? (
          <FieldDataCard data={selected.field_data} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuários reais (Chrome UX Report)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                O Google ainda não tem visitas suficientes desta página para publicar dados de usuários reais.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
