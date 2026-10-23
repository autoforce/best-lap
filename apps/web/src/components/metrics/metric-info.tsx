import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { METRICS, describeThresholds, type MetricKey } from '@/lib/metrics'

interface MetricInfoProps {
  metric: MetricKey
}

/** Small info button that explains what a metric measures and its official bands */
export function MetricInfo({ metric }: MetricInfoProps) {
  const definition = METRICS[metric]
  const bands = describeThresholds(metric)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`O que é ${definition.shortLabel}?`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 text-sm" align="start">
        <div>
          <p className="font-semibold">
            {definition.label} {definition.shortLabel !== definition.label && `(${definition.shortLabel})`}
          </p>
          <p className="mt-1 text-muted-foreground">{definition.description}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs tabular-nums">
          <dt className="font-medium text-good">Bom</dt>
          <dd>{bands.good}</dd>
          <dt className="font-medium text-warn">Precisa melhorar</dt>
          <dd>{bands.warn}</dd>
          <dt className="font-medium text-poor">Ruim</dt>
          <dd>{bands.poor}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          Faixas: {definition.source}. Medição de laboratório, em celular (estratégia mobile do PageSpeed Insights).
        </p>
      </PopoverContent>
    </Popover>
  )
}
