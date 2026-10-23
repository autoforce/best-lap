import type { MetricsRepository } from '../../modules/metric/metrics-repository.interface'
import { queryChannelWindows, utcDaysAgo, type ChannelWindowRow } from './channel-windows'

export interface PortfolioSummary {
  channels_with_data: number
  median_score: number | null
  median_score_previous: number | null
  /** Share of channels with a rounded score of 90 or more, from 0 to 1 */
  good_share: number | null
  good_share_previous: number | null
  improved: Array<{ channel_id: string; channel_name: string; from: number; to: number }>
  declined: Array<{ channel_id: string; channel_name: string; from: number; to: number }>
}

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const goodShare = (values: number[]) => (values.length ? values.filter((v) => Math.round(v) >= 90).length / values.length : null)

export function summarizePortfolio(windows: ChannelWindowRow[]): PortfolioSummary {
  const current = windows.map((w) => w.recent_score).filter((v): v is number => v !== null)
  const previous = windows.map((w) => w.baseline_score).filter((v): v is number => v !== null)

  const changes = windows
    .filter((w) => w.recent_score !== null && w.baseline_score !== null)
    .map((w) => ({
      channel_id: w.channel_id,
      channel_name: w.channel_name,
      from: Math.round(w.baseline_score!),
      to: Math.round(w.recent_score!),
    }))

  return {
    channels_with_data: current.length,
    median_score: median(current),
    median_score_previous: median(previous),
    good_share: goodShare(current),
    good_share_previous: goodShare(previous),
    improved: changes.filter((c) => c.to > c.from).sort((a, b) => b.to - b.from - (a.to - a.from)).slice(0, 3),
    declined: changes.filter((c) => c.to < c.from).sort((a, b) => a.to - a.from - (b.to - b.from)).slice(0, 3),
  }
}

/** Week over week view of the portfolio, used by the weekly digest */
export class GetPortfolioSummaryUseCase {
  constructor(private metricsRepository: MetricsRepository) {}

  async execute({ providerId, now = new Date() }: { providerId?: string; now?: Date } = {}): Promise<PortfolioSummary> {
    const windows = await queryChannelWindows(this.metricsRepository, {
      recentStart: utcDaysAgo(6, now),
      baselineStart: utcDaysAgo(13, now),
      providerId,
    })
    return summarizePortfolio(windows)
  }
}
