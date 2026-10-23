import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildAttentionItems } from '../src/usecases/insights/get-attention-items-use-case'
import { summarizePortfolio } from '../src/usecases/insights/get-portfolio-summary-use-case'
import type { ChannelWindowRow } from '../src/usecases/insights/channel-windows'

const row = (id: string, theme: string, baseline: number, recent: number, extra: Partial<ChannelWindowRow> = {}): ChannelWindowRow => ({
  channel_id: id,
  channel_name: `Site ${id}`,
  theme,
  provider_id: null,
  baseline_score: baseline,
  recent_score: recent,
  baseline_lcp: 2500,
  recent_lcp: 2600,
  baseline_cls: 0.05,
  recent_cls: 0.05,
  ...extra,
})

describe('buildAttentionItems', () => {
  it('flags a score drop of 10+ points, critical from 20', () => {
    const items = buildAttentionItems([row('a', 't', 90, 79), row('b', 't', 90, 68), row('c', 't', 90, 85)], [], [])
    const a = items.find((i) => i.id === 'regression:a')!
    const b = items.find((i) => i.id === 'regression:b')!
    assert.equal(a.severity, 'warn')
    assert.equal(b.severity, 'poor')
    assert.equal(items.some((i) => i.id === 'regression:c'), false)
  })

  it('groups regressions of one theme as a probable template change', () => {
    const items = buildAttentionItems([row('a', 'aurora', 90, 70), row('b', 'aurora', 85, 70), row('c', 'aurora', 80, 60)], [], [])
    assert.equal(items[0].kind, 'theme_regression')
    assert.equal(items[0].channels?.length, 3)
  })

  it('flags metrics that cross into the poor band', () => {
    const items = buildAttentionItems([row('a', 't', 80, 78, { baseline_lcp: 3800, recent_lcp: 4300, baseline_cls: 0.2, recent_cls: 0.3 })], [], [])
    assert.ok(items.some((i) => i.id === 'entered_poor:lcp:a'))
    assert.ok(items.some((i) => i.id === 'entered_poor:cls:a'))
  })

  it('groups many stale channels into one item', () => {
    const stale = Array.from({ length: 7 }, (_, i) => ({ channel_id: `s${i}`, channel_name: `S${i}`, last_collected_at: null }))
    const items = buildAttentionItems([], stale, [])
    assert.equal(items.length, 1)
    assert.equal(items[0].id, 'stale:many')
  })

  it('orders critical items before warnings', () => {
    const items = buildAttentionItems(
      [row('a', 't1', 90, 79), row('b', 't2', 90, 60)],
      [],
      [{ channel_id: 'h', channel_name: 'H' }]
    )
    assert.deepEqual(items.map((i) => i.severity), ['poor', 'warn', 'warn'])
  })
})

describe('summarizePortfolio', () => {
  it('computes medians, share of good sites and biggest changes', () => {
    const summary = summarizePortfolio([row('a', 't', 80, 92), row('b', 't', 70, 60), row('c', 't', 89.6, 89.4)])
    assert.equal(summary.median_score, 89.4)
    // 89.4 is shown as 89, so only 92 counts as good
    assert.equal(summary.good_share, 1 / 3)
    assert.deepEqual(summary.improved.map((c) => c.channel_id), ['a'])
    assert.deepEqual(summary.declined.map((c) => c.channel_id), ['b', 'c'])
  })
})
