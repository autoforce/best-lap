import { cn } from '@/lib/utils'

interface SparklineProps {
  values: number[]
  tone?: 'good' | 'poor' | 'neutral'
  width?: number
  height?: number
  className?: string
  label?: string
}

const TONE_CLASS = {
  good: 'text-good',
  poor: 'text-poor',
  neutral: 'text-muted-foreground',
}

/** Tiny trend line with an area fill and an emphasized last point */
export function Sparkline({ values, tone = 'neutral', width = 96, height = 28, className, label }: SparklineProps) {
  if (values.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const pad = 3
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (max - min < 6) {
    min -= 3
    max += 3
  }

  const points = values.map((v, i) => [
    pad + (i * (width - pad * 2)) / (values.length - 1),
    height - pad - ((v - min) / (max - min)) * (height - pad * 2),
  ])
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${height} L${points[0][0].toFixed(1)} ${height} Z`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('block', TONE_CLASS[tone], className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={area} fill="currentColor" fillOpacity={0.14} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.6} fill="currentColor" />
    </svg>
  )
}
