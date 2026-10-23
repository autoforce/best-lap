import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

/** Loads the env module in a fresh process, since it validates process.env on import */
function loadEnv(vars: Record<string, string>) {
  // The package is CommonJS, so under ESM import its exports arrive on `default`
  const script = `import('./index.ts').then((m) => console.log(JSON.stringify((m.env ?? m.default.env)))).catch(() => console.log('INVALID'))`
  const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: new URL('..', import.meta.url),
    env: { PATH: process.env.PATH, NODE_ENV: 'test', ...vars },
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .pop()!
  return output === 'INVALID' ? null : JSON.parse(output)
}

describe('env', () => {
  it('reads "false" as false (z.coerce.boolean would read it as true)', () => {
    assert.equal(loadEnv({ SYNC_CHANNELS_ENABLED: 'false' }).SYNC_CHANNELS_ENABLED, false)
    assert.equal(loadEnv({ SYNC_CHANNELS_ENABLED: 'TRUE' }).SYNC_CHANNELS_ENABLED, true)
    assert.equal(loadEnv({}).SYNC_CHANNELS_ENABLED, true)
  })

  it('rejects values that are not a boolean', () => {
    assert.equal(loadEnv({ SYNC_CHANNELS_ENABLED: 'talvez' }), null)
  })

  it('does not require JWT_SECRET outside the API', () => {
    assert.equal(loadEnv({}).JWT_SECRET, undefined)
  })

  it('limits the database pool to 5 connections by default', () => {
    assert.equal(loadEnv({}).DB_POOL_MAX, 5)
    assert.equal(loadEnv({ DB_POOL_MAX: '8' }).DB_POOL_MAX, 8)
  })

  it('takes the port from API_PORT, then SERVER_PORT, then PORT', () => {
    assert.equal(loadEnv({ PORT: '10000' }).API_PORT, 10000)
    assert.equal(loadEnv({ SERVER_PORT: '4444', PORT: '10000' }).API_PORT, 4444)
    assert.equal(loadEnv({ API_PORT: '3333', SERVER_PORT: '4444' }).API_PORT, 3333)
  })
})
