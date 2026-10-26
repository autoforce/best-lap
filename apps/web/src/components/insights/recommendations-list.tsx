import { Badge } from '@/components/ui/badge'
import { IMPACT_LABELS, OWNER_HINTS, OWNER_LABELS } from '@/lib/diagnosis'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/types/api'

const IMPACT_STRIPE: Record<Recommendation['impact'], string> = {
  high: 'bg-poor',
  medium: 'bg-warn',
  low: 'bg-muted-foreground/40',
}

/** Rule-based recommendations: the cause, who usually fixes it, what to do and the evidence */
export function RecommendationsList({ items, emptyText }: { items: Recommendation[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <li key={item.id} className="flex items-stretch gap-3 pr-4">
          <span className={cn('w-1 shrink-0', IMPACT_STRIPE[item.impact])} aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" title={OWNER_HINTS[item.owner]}>
                {OWNER_LABELS[item.owner]}
              </Badge>
              <span className="text-xs text-muted-foreground">{IMPACT_LABELS[item.impact]}</span>
            </div>
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.detail}</p>
            {item.evidence.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {item.evidence.map((line) => (
                  <li key={line} className="break-all before:mr-1.5 before:content-['›']">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
