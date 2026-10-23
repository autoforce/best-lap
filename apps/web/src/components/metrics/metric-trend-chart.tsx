import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AverageMetric } from '@/types/api'
import { bucketDate, type Granularity } from '@/lib/period'
import {
  METRICS,
  RATING_LABELS,
  formatMetric,
  rateMetric,
  readMetric,
  type MetricKey,
} from '@/lib/metrics'

export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
]

export interface TrendSeries {
  id: string
  name: string
  color?: string
  points: Array<{ period_start: string } & Partial<AverageMetric>>
}

interface MetricTrendChartProps {
  metric: MetricKey
  series: TrendSeries[]
  granularity: Granularity
  height?: number
  showLegend?: boolean
}

const AXIS_FORMAT: Record<Granularity, string> = {
  hourly: 'dd/MM HH:mm',
  daily: 'dd/MM',
  weekly: 'dd/MM',
}

function formatAxisValue(metric: MetricKey, value: number) {
  if (metric === 'score' || metric === 'seo') return String(value)
  if (metric === 'cls') return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  if (metric === 'tbt' || metric === 'response_time') return `${Math.round(value)}`
  return `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}s`
}

/**
 * Line chart of one metric, with the official bands (good / needs improvement / poor)
 * painted behind the lines so every point reads as a verdict.
 */
export function MetricTrendChart({
  metric,
  series,
  granularity,
  height = 320,
  showLegend = series.length > 1,
}: MetricTrendChartProps) {
  const definition = METRICS[metric]
  const rows = new Map<string, Record<string, number | string | null>>()

  series.forEach((s) => {
    s.points.forEach((point) => {
      const key = point.period_start
      if (!rows.has(key)) rows.set(key, { period_start: key })
      rows.get(key)![s.id] = readMetric(point, metric)
    })
  })

  const data = [...rows.values()].sort((a, b) =>
    String(a.period_start).localeCompare(String(b.period_start))
  )

  const values = data.flatMap((row) =>
    series.map((s) => row[s.id]).filter((v): v is number => typeof v === 'number')
  )

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Nenhum dado no período selecionado.
      </div>
    )
  }

  const isScore = metric === 'score' || metric === 'seo'
  const yMax = isScore ? 100 : Math.max(...values, definition.poor) * 1.15
  const bands = definition.higherIsBetter
    ? [
        { y1: definition.good, y2: 100, rating: 'good' as const },
        { y1: definition.poor, y2: definition.good, rating: 'warn' as const },
        { y1: 0, y2: definition.poor, rating: 'poor' as const },
      ]
    : [
        { y1: 0, y2: definition.good, rating: 'good' as const },
        { y1: definition.good, y2: definition.poor, rating: 'warn' as const },
        { y1: definition.poor, y2: yMax, rating: 'poor' as const },
      ]

  const bandFill = { good: 'hsl(var(--good-soft))', warn: 'hsl(var(--warn-soft))', poor: 'hsl(var(--poor-soft))' }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        {bands.map((band) => (
          <ReferenceArea
            key={band.rating}
            y1={band.y1}
            y2={band.y2}
            fill={bandFill[band.rating]}
            fillOpacity={0.7}
            strokeOpacity={0}
            ifOverflow="hidden"
          />
        ))}
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="period_start"
          tickFormatter={(value: string) => format(bucketDate(value, granularity), AXIS_FORMAT[granularity], { locale: ptBR })}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          domain={[0, isScore ? 100 : Math.ceil(yMax)]}
          tickFormatter={(value: number) => formatAxisValue(metric, value)}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                <p className="mb-1 font-medium">
                  {granularity === 'weekly' ? 'Semana de ' : ''}
                  {format(bucketDate(String(label), granularity), granularity === 'hourly' ? "dd/MM/yyyy 'às' HH:mm" : 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                {payload.map((entry) => {
                  const value = entry.value as number
                  const rating = rateMetric(metric, value)
                  return (
                    <p key={String(entry.dataKey)} className="flex items-center gap-2 tabular-nums">
                      <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}:</span>
                      <span className="font-semibold">{formatMetric(metric, value)}</span>
                      {rating && <span className="text-muted-foreground">({RATING_LABELS[rating]})</span>}
                    </p>
                  )
                })}
              </div>
            )
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, index) => (
          <Line
            key={s.id}
            type="monotone"
            dataKey={s.id}
            name={s.name}
            stroke={s.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 2.5 } : false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
