import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { endOfUtcDay, startOfUtcDay } from '../src/utils/parse-utc-date'
import { utcDaysAgo } from '../src/usecases/insights/channel-windows'

describe('UTC date helpers', () => {
  it('parse calendar days as UTC regardless of the server timezone', () => {
    assert.equal(startOfUtcDay('2026-10-17').toISOString(), '2026-10-17T00:00:00.000Z')
    assert.equal(endOfUtcDay('2026-10-17').toISOString(), '2026-10-17T23:59:59.999Z')
  })

  it('utcDaysAgo returns UTC midnights', () => {
    assert.equal(utcDaysAgo(1, new Date('2026-10-23T02:30:00Z')).toISOString(), '2026-10-22T00:00:00.000Z')
  })
})
