import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { nextCronRun } from '../src/lib/next-cron-run'

describe('nextCronRun', () => {
  const expression = '0 8,14,20 * * *'

  it('finds the next run later the same day in the given timezone', () => {
    // 15:00 in São Paulo (UTC-3) → next run 20:00 local = 23:00 UTC
    const next = nextCronRun(expression, new Date('2026-10-23T18:00:00Z'), 'America/Sao_Paulo')
    assert.equal(next?.toISOString(), '2026-10-23T23:00:00.000Z')
  })

  it('rolls over to the next day', () => {
    // 21:00 local → 08:00 local next day = 11:00 UTC
    const next = nextCronRun(expression, new Date('2026-10-24T00:00:00Z'), 'America/Sao_Paulo')
    assert.equal(next?.toISOString(), '2026-10-24T11:00:00.000Z')
  })

  it('supports steps and ranges', () => {
    const next = nextCronRun('*/30 9-10 * * *', new Date('2026-10-23T09:10:00Z'), 'UTC')
    assert.equal(next?.toISOString(), '2026-10-23T09:30:00.000Z')
  })

  it('returns null for expressions that depend on weekday or month', () => {
    assert.equal(nextCronRun('0 9 * * 1', new Date(), 'UTC'), null)
    assert.equal(nextCronRun('not a cron', new Date(), 'UTC'), null)
  })
})
