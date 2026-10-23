import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeDelta, formatMetric, isBetter, rateMetric, summarize } from '../src/lib/metrics'

describe('rateMetric', () => {
  it('uses the official bands', () => {
    assert.equal(rateMetric('lcp', 2500), 'good')
    assert.equal(rateMetric('lcp', 3000), 'warn')
    assert.equal(rateMetric('lcp', 4001), 'poor')
    assert.equal(rateMetric('cls', 0.26), 'poor')
    assert.equal(rateMetric('score', 49), 'poor')
  })

  it('rates scores by the rounded number shown on screen', () => {
    assert.equal(formatMetric('seo', 89.6), '90')
    assert.equal(rateMetric('seo', 89.6), 'good')
  })

  it('returns null without a value', () => {
    assert.equal(rateMetric('score', null), null)
  })
})

describe('computeDelta', () => {
  it('knows when lower is better', () => {
    assert.equal(computeDelta('lcp', 3000, 2500)?.improved, false)
    assert.equal(computeDelta('score', 80, 70)?.improved, true)
  })

  it('treats tiny changes as stable', () => {
    assert.equal(computeDelta('score', 70.2, 70)?.label, 'estável')
  })
})

describe('isBetter', () => {
  it('picks the fastest LCP and the highest score', () => {
    assert.equal(isBetter('lcp', 2000, 3000), true)
    assert.equal(isBetter('score', 60, 90), false)
  })
})

describe('summarize', () => {
  it('averages API rows, including string values', () => {
    const summary = summarize([
      { period_start: 'x', avg_score: 80, avg_response_time: '500.5' },
      { period_start: 'y', avg_score: 60, avg_response_time: '499.5' },
    ])
    assert.equal(summary.score, 70)
    assert.equal(summary.response_time, 500)
    assert.equal(summary.lcp, null)
  })
})
