import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Crown } from 'lucide-react'

interface ThemeCardProps {
  theme: string
  value: number
  label: string
  channelCount: number
  isLoading?: boolean
  color?: string
  isBest?: boolean
}

function getScoreColor(score: number, isScore: boolean): string {
  if (!isScore) return 'text-foreground'
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreStatus(score: number, isScore: boolean): string {
  if (!isScore) return ''
  if (score >= 90) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Regular'
  return 'Crítico'
}

export function ThemeCard({
  theme,
  value,
  label,
  channelCount,
  isLoading,
  color,
  isBest,
}: ThemeCardProps) {
  if (isLoading) {
    return (
      <Card className="cursor-pointer transition-all hover:shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-12" />
        </CardContent>
      </Card>
    )
  }

  const isScore = label.includes('Score')
  const scoreColor = getScoreColor(value, isScore)
  const scoreStatus = getScoreStatus(value, isScore)

  return (
    <Link to="/themes/$theme" params={{ theme }} className="block">
      <Card
        className={`cursor-pointer transition-all hover:shadow-sm ${
          isBest ? 'ring-2 ring-yellow-500' : ''
        }`}
      >
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {color && (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="font-medium capitalize">{theme}</span>
              {isBest && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
              {scoreStatus && !isBest && (
                <Badge variant="secondary" className="text-xs">
                  {scoreStatus}
                </Badge>
              )}
              {isBest && (
                <Badge variant="default" className="bg-yellow-500 text-xs hover:bg-yellow-600">
                  Melhor
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {channelCount} {channelCount === 1 ? 'canal' : 'canais'}
            </p>
          </div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {value.toFixed(label.includes('Time') ? 0 : 1)}
            {label.includes('Time') && <span className="text-sm">ms</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
