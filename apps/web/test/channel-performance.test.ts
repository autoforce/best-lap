import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { format, subDays } from 'date-fns'
import { buildChannelSnapshots } from '../src/lib/channel-performance'
import type { ChannelMetricGrouped } from '../src/types/api'

const day = (daysAgo: number, score: number): ChannelMetricGrouped => ({
  channel_id: 'c1',
  channel_name: 'Site',
  period_start: `${format(subDays(new Date(), daysAgo), 'yyyy-MM-dd')}T00:00:00.000Z`,
  avg_score: score,
  avg_seo: 90,
  avg_response_time: '400',
  avg_fcp: 1500,
  avg_si: 3000,
  avg_lcp: 2500,
  avg_tbt: 200,
  avg_cls: 0.05,
})

describe('buildChannelSnapshots', () => {
  it('compares the last 7 days with the 7 before and keeps a 30-day trend', () => {
    const rows = [...Array.from({ length: 7 }, (_, i) => day(i + 7, 90)), ...Array.from({ length: 7 }, (_, i) => day(i, 70))]
    const snapshot = buildChannelSnapshots(rows).get('c1')!
    assert.equal(snapshot.score, 70)
    assert.equal(snapshot.scoreDelta?.diff, -20)
    assert.equal(snapshot.scoreDelta?.improved, false)
    assert.equal(snapshot.trend.length, 14)
  })
})
