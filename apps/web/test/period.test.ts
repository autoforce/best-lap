import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bucketDate, normalizePeriod, periodWindow, splitByPeriod } from '../src/lib/period'

describe('normalizePeriod', () => {
  it('falls back to safe values from untrusted URLs', () => {
    assert.deepEqual(normalizePeriod('xyz', 'monthly'), { range: '30d', granularity: 'daily' })
  })

  it('fixes groupings the data cannot support', () => {
    // Raw collections are only kept for 14 days, so 90 days cannot be grouped by collection
    assert.deepEqual(normalizePeriod('90d', 'hourly'), { range: '90d', granularity: 'daily' })
    assert.deepEqual(normalizePeriod('12m', 'daily'), { range: '12m', granularity: 'weekly' })
  })
})

describe('periodWindow and splitByPeriod', () => {
  it('covers the range and the previous one', () => {
    const window = periodWindow({ range: '7d', granularity: 'daily' }, new Date(2026, 9, 23))
    assert.deepEqual(window, { startDate: '2026-10-17', endDate: '2026-10-23', previousStartDate: '2026-10-10' })
  })

  it('splits points by the start of the current range', () => {
    const points = [{ period_start: '2026-10-16T00:00:00.000Z' }, { period_start: '2026-10-17T00:00:00.000Z' }]
    const { current, previous } = splitByPeriod(points, { range: '7d', granularity: 'daily' })
    assert.equal(current.length + previous.length, 2)
  })
})

describe('bucketDate', () => {
  it('shows daily buckets on their UTC calendar day', () => {
    const date = bucketDate('2026-10-10T00:00:00.000Z', 'daily')
    assert.equal(date.getDate(), 10)
  })
})
