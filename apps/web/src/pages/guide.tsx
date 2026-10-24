import { Link } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RatingBadge } from '@/components/metrics/rating-badge'
import { METRICS, describeThresholds, type MetricKey } from '@/lib/metrics'

const CONCEPTS = [
  {
    term: 'Canal',
    text: 'Um site monitorado, identificado pela URL. Cada canal tem uma ou mais páginas; a home ("/") é a que entra nas médias e no ranking.',
  },
  {
    term: 'Página',
    text: 'Um caminho do site (por exemplo /seminovos). Todas as páginas cadastradas são medidas em cada coleta e aparecem na aba Páginas do canal.',
  },
  {
    term: 'Tema',
    text: 'O template do site. Quando vários sites do mesmo tema pioram juntos, a causa costuma ser uma mudança no template, e a correção também.',
  },
  {
    term: 'Provedor',
    text: 'A plataforma que desenvolveu o site, como a Autoforce ou um concorrente. Serve para comparar plataformas.',
  },
  {
    term: 'Canal de referência',
    text: 'Um site de fora usado como comparação de mercado. É coletado em uma fila separada dos clientes.',
  },
  {
    term: 'Coleta',
    text: 'Uma medição do Google PageSpeed Insights em um celular simulado, três vezes ao dia. O horário da última e da próxima aparece no topo de todas as telas.',
  },
]

const GUIDE_METRICS: MetricKey[] = ['score', 'lcp', 'cls', 'tbt', 'fcp', 'response_time']

export function GuidePage() {
  return (
    <AppShell title="Como ler o Best Lap" description="Conceitos, faixas de qualidade e por onde começar" breadcrumbs={[{ label: 'Guia' }]}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Por onde começar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                No <Link to="/" className="text-primary hover:underline">Dashboard</Link>, veja primeiro os números
                do período. O botão <strong>Alertas</strong>, no topo, lista quedas de score, métricas que passaram para
                Ruim e sites sem coleta.
              </li>
              <li>
                Abra o canal. A aba <strong>Performance</strong> mostra a evolução; a aba <strong>O que corrigir</strong>{' '}
                lista as recomendações do Lighthouse com a economia estimada.
              </li>
              <li>
                Em <Link to="/themes" className="text-primary hover:underline">Por Tema</Link>, veja os{' '}
                <strong>problemas comuns no tema</strong>: o que aparece em muitos sites costuma ser corrigido uma vez, no
                template.
              </li>
              <li>
                Use <strong>Copiar link</strong> para mandar exatamente o que você está vendo: filtros e período ficam no
                endereço.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faixas de qualidade</CardTitle>
            <p className="text-sm text-muted-foreground">
              As mesmas do Google. Todo número do Best Lap vem com uma delas e com a variação contra o período anterior,
              em verde quando melhora e em vermelho quando piora.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Métrica</th>
                    <th className="py-2 pr-4 font-medium"><RatingBadge rating="good" /></th>
                    <th className="py-2 pr-4 font-medium"><RatingBadge rating="warn" /></th>
                    <th className="py-2 font-medium"><RatingBadge rating="poor" /></th>
                  </tr>
                </thead>
                <tbody>
                  {GUIDE_METRICS.map((metric) => {
                    const bands = describeThresholds(metric)
                    return (
                      <tr key={metric} className="border-b last:border-0 align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{METRICS[metric].shortLabel === METRICS[metric].label ? METRICS[metric].label : `${METRICS[metric].shortLabel} · ${METRICS[metric].label}`}</p>
                          <p className="text-xs text-muted-foreground">{METRICS[metric].description}</p>
                        </td>
                        <td className="py-3 pr-4 tabular-nums">{bands.good}</td>
                        <td className="py-3 pr-4 tabular-nums">{bands.warn}</td>
                        <td className="py-3 tabular-nums">{bands.poor}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conceitos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {CONCEPTS.map((concept) => (
                <div key={concept.term}>
                  <dt className="font-medium">{concept.term}</dt>
                  <dd className="text-sm text-muted-foreground">{concept.text}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laboratório e usuários reais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              As métricas do Best Lap são de <strong className="text-foreground">laboratório</strong>: uma medição
              controlada, sempre no mesmo celular simulado, boa para comparar sites e detectar regressões.
            </p>
            <p>
              Quando o site tem visitas suficientes, a aba O que corrigir também mostra os dados de{' '}
              <strong className="text-foreground">usuários reais</strong> do Chrome UX Report, que são os que o Google usa
              no ranking de busca. Os dois números costumam ser diferentes, e isso é esperado.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
