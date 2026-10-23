import { auditHint, auditTitle, formatSavings } from '@/lib/lighthouse-audits'
import type { LighthouseFinding } from '@/types/api'

interface FindingsListProps {
  findings: LighthouseFinding[]
  emptyText: string
  showSavings?: boolean
}

/** Lighthouse findings with a Portuguese title, a practical hint and the estimated saving */
export function FindingsList({ findings, emptyText, showSavings = true }: FindingsListProps) {
  if (findings.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <ol className="divide-y">
      {findings.map((finding) => {
        const savings = showSavings ? formatSavings(finding.savings_ms, finding.savings_bytes) : ''
        return (
          <li key={finding.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
            <div className="min-w-0">
              <p className="font-medium">{auditTitle(finding.id, finding.title)}</p>
              <p className="text-sm text-muted-foreground">{auditHint(finding.id, finding.description)}</p>
              {finding.display_value && (
                <p className="mt-1 text-xs text-muted-foreground">Lighthouse: {finding.display_value}</p>
              )}
            </div>
            {savings && (
              <p className="whitespace-nowrap text-sm font-semibold text-good tabular-nums sm:text-right">
                {savings}
                <span className="block text-xs font-normal text-muted-foreground">economia estimada</span>
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
