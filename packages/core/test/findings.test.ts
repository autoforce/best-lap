import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractFieldData, extractLighthouseFindings } from '../src/utils/extract-lighthouse-insights'
import { aggregateOpportunities } from '../src/utils/aggregate-opportunities'
import type { PageInsightsWithContext } from '../src/modules/insights/page-insights.interface'

// Shape taken from a real PageSpeed Insights response (Lighthouse 13.5)
const lighthouseResult = {
  lighthouseVersion: '13.5.0',
  categories: {
    performance: {
      auditRefs: [
        { id: 'first-contentful-paint', group: 'metrics' },
        { id: 'image-delivery-insight', group: 'insights' },
        { id: 'cache-insight', group: 'insights' },
        { id: 'unused-javascript', group: 'diagnostics' },
        { id: 'forced-reflow-insight', group: 'insights' },
        { id: 'font-display-insight', group: 'insights' },
        { id: 'network-requests', group: 'hidden' },
      ],
    },
  },
  audits: {
    'first-contentful-paint': { id: 'first-contentful-paint', title: 'FCP', score: 0.3, scoreDisplayMode: 'numeric' },
    'image-delivery-insight': {
      id: 'image-delivery-insight',
      title: 'Improve image delivery',
      description: 'Reducing the download time of images. [Learn more](https://web.dev)',
      score: 0,
      scoreDisplayMode: 'metricSavings',
      displayValue: 'Est savings of 2,189 KiB',
      metricSavings: { LCP: 8250, FCP: 0 },
    },
    'cache-insight': {
      id: 'cache-insight',
      title: 'Use efficient cache lifetimes',
      score: 0.5,
      scoreDisplayMode: 'metricSavings',
      metricSavings: { LCP: 7950 },
      details: { overallSavingsBytes: 2_343_000 },
    },
    'unused-javascript': {
      id: 'unused-javascript',
      title: 'Reduce unused JavaScript',
      score: 0.5,
      scoreDisplayMode: 'metricSavings',
      details: { overallSavingsBytes: 516_000 },
    },
    'forced-reflow-insight': { id: 'forced-reflow-insight', title: 'Forced reflow', score: 0, scoreDisplayMode: 'numeric' },
    'font-display-insight': { id: 'font-display-insight', title: 'Font display', score: 1, scoreDisplayMode: 'metricSavings' },
    'network-requests': { id: 'network-requests', title: 'Network', score: null, scoreDisplayMode: 'informative' },
  },
}

describe('extractLighthouseFindings', () => {
  const { opportunities, diagnostics, lighthouseVersion } = extractLighthouseFindings(lighthouseResult)

  it('keeps failing audits with savings as opportunities, biggest first', () => {
    assert.deepEqual(opportunities.map((o) => o.id), ['image-delivery-insight', 'cache-insight', 'unused-javascript'])
    assert.equal(opportunities[0].savings_ms, 8250)
    assert.equal(opportunities[1].savings_bytes, 2_343_000)
  })

  it('strips markdown links from descriptions', () => {
    assert.equal(opportunities[0].description, 'Reducing the download time of images. Learn more')
  })

  it('puts failing audits without savings in diagnostics and skips metrics, passing and hidden audits', () => {
    assert.deepEqual(diagnostics.map((d) => d.id), ['forced-reflow-insight'])
    assert.equal(lighthouseVersion, '13.5.0')
  })
})

describe('extractFieldData', () => {
  it('reads CrUX p75 values and converts CLS', () => {
    const data = extractFieldData({
      loadingExperience: {
        overall_category: 'AVERAGE',
        metrics: {
          LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2478 },
          CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5 },
          INTERACTION_TO_NEXT_PAINT: { percentile: 316 },
        },
      },
    })
    assert.deepEqual(data, { category: 'AVERAGE', lcp_ms: 2478, cls: 0.05, inp_ms: 316, fcp_ms: undefined, ttfb_ms: undefined, origin_fallback: false })
  })

  it('returns null when Google has no field data', () => {
    assert.equal(extractFieldData({ loadingExperience: { metrics: {} } }), null)
  })
})

describe('aggregateOpportunities', () => {
  const page = (channel: string, findings: Array<[string, number]>): PageInsightsWithContext => ({
    page_id: `${channel}-home`,
    page_name: 'Home',
    page_path: '/',
    channel_id: channel,
    channel_name: channel.toUpperCase(),
    theme: 'aurora',
    collected_at: new Date(),
    opportunities: findings.map(([id, ms]) => ({ id, title: id, score: 0, savings_ms: ms })),
    diagnostics: [],
  })

  it('ranks by number of affected channels, then by average saving', () => {
    const result = aggregateOpportunities([
      page('a', [['images', 3000], ['cache', 500]]),
      page('b', [['images', 1000], ['js', 9000]]),
      page('c', [['images', 2000], ['cache', 700]]),
    ])
    assert.equal(result.channels_with_data, 3)
    assert.deepEqual(result.items.map((i) => [i.id, i.channels_affected]), [['images', 3], ['cache', 2], ['js', 1]])
    assert.equal(result.items[0].avg_savings_ms, 2000)
    assert.equal(result.items[0].top_channels[0].id, 'a')
  })
})
