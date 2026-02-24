import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useChannelRankings, type ChannelPerformance } from '@/hooks/use-channel-rankings'
import type { Channel, Period } from '@/types/api'

interface TopBottomPerformersCardProps {
  channels: Channel[]
  period: Period
  isLoading?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400'
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

interface PerformerItemProps {
  rank: number
  performer: ChannelPerformance
}

function PerformerItem({ rank, performer }: PerformerItemProps) {
  const scoreColor = getScoreColor(performer.avgScore)
  const isPositive = performer.diffFromAverage >= 0
  const ArrowIcon = isPositive ? ArrowUp : ArrowDown
  const diffColor = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
  const badgeBg = isPositive
    ? 'bg-green-100 dark:bg-green-950'
    : 'bg-red-100 dark:bg-red-950'

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-sm font-medium text-muted-foreground w-4">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{performer.channelName}</p>
          <Badge
            variant="secondary"
            className={`mt-1 text-xs ${badgeBg} ${diffColor}`}
          >
            {isPositive ? '+' : ''}
            {performer.diffFromAverage.toFixed(0)} da média
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-lg font-bold ${scoreColor}`}>
          {performer.avgScore.toFixed(0)}
          <span className="text-xs font-normal text-muted-foreground">/100</span>
        </span>
        <ArrowIcon className={`h-4 w-4 ${diffColor}`} />
      </div>
    </div>
  )
}

interface PerformersListProps {
  performers: ChannelPerformance[]
  type: 'top' | 'bottom'
  isLoading: boolean
}

function PerformersList({ performers, type, isLoading }: PerformersListProps) {
  const Icon = type === 'top' ? Trophy : AlertCircle
  const title = type === 'top' ? 'Melhores Performances' : 'Performances Críticas'
  const iconColor = type === 'top'
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (performers.length === 0) {
    return null
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="divide-y">
        {performers.map((performer, index) => (
          <PerformerItem
            key={performer.channelId}
            rank={index + 1}
            performer={performer}
          />
        ))}
      </div>
    </div>
  )
}

export function TopBottomPerformersCard({
  channels,
  period,
  isLoading: externalLoading,
}: TopBottomPerformersCardProps) {
  const {
    topPerformers,
    bottomPerformers,
    isLoading: rankingsLoading,
    isError,
  } = useChannelRankings(channels, period)

  const isLoading = externalLoading || rankingsLoading
  const hasData = topPerformers.length > 0 || bottomPerformers.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <>
            <PerformersList performers={[]} type="top" isLoading={true} />
            <div className="border-t" />
            <PerformersList performers={[]} type="bottom" isLoading={true} />
          </>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar ranking de performance
            </p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Dados insuficientes para ranking
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              É necessário pelo menos 2 canais com métricas coletadas
            </p>
          </div>
        ) : (
          <>
            <PerformersList
              performers={topPerformers}
              type="top"
              isLoading={false}
            />
            {bottomPerformers.length > 0 && (
              <>
                <div className="border-t" />
                <PerformersList
                  performers={bottomPerformers}
                  type="bottom"
                  isLoading={false}
                />
              </>
            )}
          </>
        )}

        {hasData && !isLoading && (
          <div className="pt-4 border-t">
            <Link
              to="/channels"
              className="text-sm text-primary hover:underline flex items-center justify-center"
            >
              Ver Todos os Canais →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
