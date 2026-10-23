import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { clearFailures, registerFailure, retryAfterSeconds } from '../src/lib/login-attempts'

describe('login attempts', () => {
  it('blocks an e-mail after 10 failures for the rest of the window', () => {
    const now = Date.now()
    for (let i = 0; i < 10; i++) registerFailure('1.1.1.1', 'a@b.com', now)
    assert.ok(retryAfterSeconds('1.1.1.1', 'a@b.com', now) > 0)
    // Another user behind the same IP is not blocked by someone else's typos
    assert.equal(retryAfterSeconds('1.1.1.1', 'other@b.com', now), 0)
    assert.equal(retryAfterSeconds('2.2.2.2', 'a@b.com', now + 16 * 60 * 1000), 0)
  })

  it('a successful login clears the counters', () => {
    const now = Date.now()
    for (let i = 0; i < 10; i++) registerFailure('3.3.3.3', 'c@d.com', now)
    clearFailures('3.3.3.3', 'c@d.com')
    assert.equal(retryAfterSeconds('3.3.3.3', 'c@d.com', now), 0)
  })
})
