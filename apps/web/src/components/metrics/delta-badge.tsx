import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MetricDelta } from '@/lib/metrics'

interface DeltaBadgeProps {
  delta: MetricDelta | null
  comparedTo?: string
  className?: string
}

/** Change against the previous period, colored by whether it is an improvement for that metric */
export function DeltaBadge({ delta, comparedTo, className }: DeltaBadgeProps) {
  if (!delta) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {comparedTo ? 'Sem dados do período anterior' : '—'}
      </span>
    )
  }

  const Icon = delta.improved === null ? Minus : delta.diff > 0 ? ArrowUpRight : ArrowDownRight
  const color =
    delta.improved === null ? 'text-muted-foreground' : delta.improved ? 'text-good' : 'text-poor'

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold tabular-nums', color, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {delta.label}
      {comparedTo && <span className="font-normal text-muted-foreground">{comparedTo}</span>}
    </span>
  )
}
