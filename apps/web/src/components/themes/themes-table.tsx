import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface ThemeMetrics {
  theme: string
  channelCount: number
  avgScore: number
  avgSEO: number
  avgResponseTime: number
  avgFCP: number
  avgLCP: number
  avgCLS: number
  avgTBT: number
  avgSI: number
}

interface ThemesTableProps {
  data: ThemeMetrics[]
  isLoading?: boolean
}

type SortKey = keyof ThemeMetrics
type SortOrder = 'asc' | 'desc'

function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 90) return 'default'
  if (score >= 70) return 'secondary'
  return 'destructive'
}

export function ThemesTable({ data, isLoading }: ThemesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('avgScore')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortKey]
    const bValue = b[sortKey]

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    return sortOrder === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number)
  })

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalhadas por Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas Detalhadas por Tema</CardTitle>
        <p className="text-sm text-muted-foreground">
          Clique nas colunas para ordenar
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('theme')}
                >
                  Tema
                  <SortIcon columnKey="theme" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('channelCount')}
                >
                  Canais
                  <SortIcon columnKey="channelCount" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgScore')}
                >
                  Performance
                  <SortIcon columnKey="avgScore" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgSEO')}
                >
                  SEO
                  <SortIcon columnKey="avgSEO" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgResponseTime')}
                >
                  Response Time
                  <SortIcon columnKey="avgResponseTime" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgLCP')}
                >
                  LCP
                  <SortIcon columnKey="avgLCP" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgFCP')}
                >
                  FCP
                  <SortIcon columnKey="avgFCP" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgCLS')}
                >
                  CLS
                  <SortIcon columnKey="avgCLS" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgTBT')}
                >
                  TBT
                  <SortIcon columnKey="avgTBT" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('avgSI')}
                >
                  SI
                  <SortIcon columnKey="avgSI" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Nenhum tema encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((theme) => (
                  <TableRow
                    key={theme.theme}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium capitalize">
                      <Link
                        to="/themes/$theme"
                        params={{ theme: theme.theme }}
                        className="block w-full"
                      >
                        {theme.theme}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {theme.channelCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getScoreBadgeVariant(theme.avgScore)}>
                        {theme.avgScore.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getScoreBadgeVariant(theme.avgSEO)}>
                        {theme.avgSEO.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {theme.avgResponseTime.toFixed(0)}ms
                    </TableCell>
                    <TableCell className="text-right">
                      {(theme.avgLCP / 1000).toFixed(2)}s
                    </TableCell>
                    <TableCell className="text-right">
                      {(theme.avgFCP / 1000).toFixed(2)}s
                    </TableCell>
                    <TableCell className="text-right">
                      {theme.avgCLS.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {theme.avgTBT.toFixed(0)}ms
                    </TableCell>
                    <TableCell className="text-right">
                      {(theme.avgSI / 1000).toFixed(2)}s
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
