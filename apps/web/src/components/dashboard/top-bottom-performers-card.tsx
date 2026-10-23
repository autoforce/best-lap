import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, AlertCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useChannelRankings, type ChannelPerformance } from '@/hooks/use-channel-rankings'
import type { ChannelMetricGrouped } from '@/types/api'
import { rateMetric } from '@/lib/metrics'
import { RatingBadge } from '@/components/metrics/rating-badge'

interface TopBottomPerformersCardProps {
  rows: ChannelMetricGrouped[]
  channelIds?: Set<string>
  periodLabel: string
  isLoading?: boolean
}

function PerformerItem({ rank, performer }: { rank: number; performer: ChannelPerformance }) {
  const diff = Math.round(performer.diffFromAverage)

  return (
    <Link
      to="/channels/$channelId"
      params={{ channelId: performer.channelId }}
      className="flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-accent"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="w-4 text-sm font-medium text-muted-foreground tabular-nums">{rank}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{performer.channelName}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {diff === 0 ? 'Na média' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} pts da média`}
          </p>
        </div>
      </div>
      <RatingBadge rating={rateMetric('score', performer.avgScore)} className="text-sm">
        {Math.round(performer.avgScore)}
      </RatingBadge>
    </Link>
  )
}

function PerformersList({ performers, type }: { performers: ChannelPerformance[]; type: 'top' | 'bottom' }) {
  if (performers.length === 0) return null
  const Icon = type === 'top' ? Trophy : AlertCircle

  return (
    <div className="space-y-1">
      <div className="mb-1 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${type === 'top' ? 'text-good' : 'text-poor'}`} />
        <h3 className="font-semibold">{type === 'top' ? 'Melhores performances' : 'Piores performances'}</h3>
      </div>
      <div className="divide-y">
        {performers.map((performer, index) => (
          <PerformerItem key={performer.channelId} rank={index + 1} performer={performer} />
        ))}
      </div>
    </div>
  )
}

export function TopBottomPerformersCard({ rows, channelIds, periodLabel, isLoading }: TopBottomPerformersCardProps) {
  const { topPerformers, bottomPerformers } = useChannelRankings(rows, channelIds)
  const hasData = topPerformers.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de performance</CardTitle>
        <p className="text-sm text-muted-foreground">Score médio da home nos {periodLabel}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ainda não há dados para montar o ranking.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              É preciso ter pelo menos 2 canais ativos com coletas neste período.
            </p>
          </div>
        ) : (
          <>
            <PerformersList performers={topPerformers} type="top" />
            {bottomPerformers.length > 0 && (
              <>
                <div className="border-t" />
                <PerformersList performers={bottomPerformers} type="bottom" />
              </>
            )}
            <div className="border-t pt-4">
              <Link
                to="/channels"
                search={{ sort: 'score' } as never}
                className="flex items-center justify-center text-sm text-primary hover:underline"
              >
                Ver todos os canais, do pior para o melhor →
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
