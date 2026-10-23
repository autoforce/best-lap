import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  ALLOWED_GRANULARITIES,
  GRANULARITY_LABELS,
  RANGE_OPTIONS,
  describePeriod,
  normalizePeriod,
  type Granularity,
  type PeriodSelection,
  type RangeKey,
} from '@/lib/period'

interface PeriodSelectorProps {
  value: PeriodSelection
  onChange: (value: PeriodSelection) => void
  showDescription?: boolean
}

const GRANULARITY_ORDER: Granularity[] = ['hourly', 'daily', 'weekly']

const UNAVAILABLE_REASON: Record<Granularity, string> = {
  hourly: 'Cada coleta só fica guardada por 14 dias',
  daily: 'As médias diárias ficam guardadas por 90 dias',
  weekly: 'Use um intervalo maior para agrupar por semana',
}

/** Date range and grouping as two separate choices, with a sentence describing what is shown */
export function PeriodSelector({ value, onChange, showDescription = true }: PeriodSelectorProps) {
  const allowed = ALLOWED_GRANULARITIES[value.range]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intervalo</span>
          <SegmentedControl<RangeKey>
            label="Intervalo"
            value={value.range}
            options={RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(range) => onChange(normalizePeriod(range, value.granularity))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agrupar por</span>
          <SegmentedControl<Granularity>
            label="Agrupar por"
            value={value.granularity}
            options={GRANULARITY_ORDER.map((g) => ({
              value: g,
              label: GRANULARITY_LABELS[g],
              disabled: !allowed.includes(g),
              title: allowed.includes(g) ? undefined : UNAVAILABLE_REASON[g],
            }))}
            onChange={(granularity) => onChange({ ...value, granularity })}
          />
        </div>
      </div>
      {showDescription && (
        <p className="text-xs text-muted-foreground">{describePeriod(value)}.</p>
      )}
    </div>
  )
}
