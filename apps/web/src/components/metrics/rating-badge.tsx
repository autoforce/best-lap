import { cn } from '@/lib/utils'
import { RATING_LABELS, type Rating } from '@/lib/metrics'

const RATING_STYLES: Record<Rating, string> = {
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  poor: 'bg-poor-soft text-poor',
}

const COMPACT_LABELS: Record<Rating, string> = {
  good: 'Bom',
  warn: 'Médio',
  poor: 'Ruim',
}

interface RatingBadgeProps {
  rating: Rating | null
  compact?: boolean
  className?: string
  children?: React.ReactNode
}

/** Colored pill with the official band of a metric. Children replace the label (e.g. the value itself). */
export function RatingBadge({ rating, compact, className, children }: RatingBadgeProps) {
  if (!rating) {
    return (
      <span className={cn('inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground', className)}>
        {children ?? 'Sem dados'}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        RATING_STYLES[rating],
        className
      )}
      title={RATING_LABELS[rating]}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children ?? (compact ? COMPACT_LABELS[rating] : RATING_LABELS[rating])}
    </span>
  )
}
