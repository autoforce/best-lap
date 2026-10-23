import { formatDistanceToNowStrict, format, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { useCollectionStatus } from '@/hooks/use-collection-status'
import { cn } from '@/lib/utils'

function formatWhen(date: Date): string {
  const time = format(date, 'HH:mm')
  if (isToday(date)) return `hoje, ${time}`
  if (isTomorrow(date)) return `amanhã, ${time}`
  return format(date, "dd/MM 'às' HH:mm", { locale: ptBR })
}

const STALE_AFTER_HOURS = 26

/** Shows how fresh the data is, the next scheduled collection and jobs still in the queue */
export function FreshnessIndicator({ className }: { className?: string }) {
  const { data, pending, isError } = useCollectionStatus()

  if (isError || !data) return null

  const last = data.last_collected_at ? new Date(data.last_collected_at) : null
  const next = data.next_run_at ? new Date(data.next_run_at) : null
  const isStale = !last || Date.now() - last.getTime() > STALE_AFTER_HOURS * 3600 * 1000

  return (
    <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      {pending > 0 ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
          <span>
            Coletando: <strong className="font-semibold text-foreground tabular-nums">{pending}</strong>{' '}
            {pending === 1 ? 'página na fila' : 'páginas na fila'}
          </span>
        </>
      ) : (
        <>
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              isStale ? 'bg-poor ring-4 ring-poor-soft' : 'bg-good ring-4 ring-good-soft'
            )}
            aria-hidden="true"
          />
          <span title={last ? format(last, "dd/MM/yyyy 'às' HH:mm") : undefined}>
            {last
              ? `Última coleta ${formatWhen(last)} (há ${formatDistanceToNowStrict(last, { locale: ptBR })})`
              : 'Nenhuma coleta registrada'}
            {next && <span className="hidden xl:inline"> · próxima {formatWhen(next)}</span>}
            <span className="hidden xl:inline"> · {data.strategy === 'mobile' ? 'celular' : 'desktop'}</span>
          </span>
        </>
      )}
    </div>
  )
}
