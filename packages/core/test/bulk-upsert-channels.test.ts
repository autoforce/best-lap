import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { BulkUpsertChannelsUseCase, type BulkChannelInput } from '../src/usecases/sync/bulk-upsert-channels-use-case'
import { BulkSyncRejected } from '../src/errors/bulk-sync-rejected'
import type { ChannelEntity } from '../src/modules/channel/channel-entity.interface'
import type { PageEntity } from '../src/modules/page/page-entity.interface'

/** In-memory repositories with just what the use case touches */
function makeRepos() {
  const channels: ChannelEntity[] = []
  const pages: PageEntity[] = []
  let seq = 0
  const channelsRepository = {
    async listAll() {
      return channels.map((c) => ({ ...c, pages: pages.filter((p) => p.channel_id === c.id) }))
    },
    async create(data: ChannelEntity) {
      const created = { ...data, id: `c${++seq}` }
      channels.push(created)
      return created
    },
    async update(id: string, data: Partial<ChannelEntity>) {
      Object.assign(channels.find((c) => c.id === id)!, data)
    },
  }
  const pagesRepository = {
    async create(data: PageEntity) {
      const created = { ...data, id: `p${++seq}` }
      pages.push(created)
      return created
    },
    async update(id: string, data: Partial<PageEntity>) {
      Object.assign(pages.find((p) => p.id === id)!, data)
    },
  }
  const useCase = new BulkUpsertChannelsUseCase(channelsRepository as never, pagesRepository as never)
  return { channels, pages, useCase }
}

const channel = (slug: string, overrides: Partial<BulkChannelInput> = {}): BulkChannelInput => ({
  name: slug,
  domain: `${slug}.com`,
  internal_link: `https://${slug}.com`,
  theme: 'aurora',
  active: true,
  pages: [{ name: 'Home', path: '/' }],
  ...overrides,
})

describe('BulkUpsertChannelsUseCase', () => {
  let repos: ReturnType<typeof makeRepos>
  beforeEach(() => {
    repos = makeRepos()
  })

  it('creates channels and pages, tagging the source', async () => {
    const result = await repos.useCase.execute({ source: 'classico', mode: 'partial', channels: [channel('a'), channel('b')] })
    assert.equal(result.statistics.channels.created, 2)
    assert.equal(result.statistics.pages.created, 2)
    assert.deepEqual(repos.channels.map((c) => c.source), ['classico', 'classico'])
  })

  it('full mode deactivates only channels of the same source', async () => {
    await repos.useCase.execute({ source: 'classico', mode: 'full', channels: [channel('a'), channel('b')] })
    await repos.useCase.execute({ source: 'workspace', mode: 'full', channels: [channel('x')] })

    const result = await repos.useCase.execute({ source: 'classico', mode: 'full', channels: [channel('a')] })

    assert.deepEqual(result.deactivated, [{ internal_link: 'https://b.com', reason: 'missing_from_source' }])
    assert.equal(repos.channels.find((c) => c.internal_link === 'https://x.com')!.active, true)
  })

  it('partial mode never deactivates missing channels', async () => {
    await repos.useCase.execute({ source: 'classico', mode: 'full', channels: [channel('a'), channel('b')] })
    const result = await repos.useCase.execute({ source: 'classico', mode: 'partial', channels: [channel('a')] })
    assert.equal(result.statistics.channels.deactivated, 0)
    assert.ok(repos.channels.every((c) => c.active))
  })

  it('ignores trailing slashes and reports unchanged channels', async () => {
    await repos.useCase.execute({ source: 'classico', mode: 'partial', channels: [channel('a')] })
    const result = await repos.useCase.execute({
      source: 'classico',
      mode: 'partial',
      channels: [channel('a', { internal_link: 'https://a.com/' })],
    })
    assert.equal(result.statistics.channels.unchanged, 1)
    assert.equal(repos.channels.length, 1)
  })

  it('refuses duplicated links in one payload', async () => {
    await assert.rejects(
      repos.useCase.execute({ source: 's', mode: 'partial', channels: [channel('a'), channel('a', { internal_link: 'https://a.com/' })] }),
      BulkSyncRejected
    )
  })

  it('refuses mass deactivation without force and writes nothing', async () => {
    const many = Array.from({ length: 10 }, (_, i) => channel(`m${i}`))
    await repos.useCase.execute({ source: 's', mode: 'full', channels: many })

    await assert.rejects(repos.useCase.execute({ source: 's', mode: 'full', channels: [channel('m0'), channel('new')] }), BulkSyncRejected)
    assert.equal(repos.channels.filter((c) => c.active).length, 10)
    assert.equal(repos.channels.length, 10)

    const forced = await repos.useCase.execute({ source: 's', mode: 'full', force: true, channels: [channel('m0')] })
    assert.equal(forced.statistics.channels.deactivated, 9)
  })

  it('dry run reports changes without writing', async () => {
    const result = await repos.useCase.execute({ source: 's', mode: 'full', dryRun: true, channels: [channel('a')] })
    assert.equal(result.statistics.channels.created, 1)
    assert.equal(repos.channels.length, 0)
  })

  it('reactivates a channel the source marks as active again', async () => {
    await repos.useCase.execute({ source: 's', mode: 'partial', channels: [channel('a', { active: false })] })
    const result = await repos.useCase.execute({ source: 's', mode: 'partial', channels: [channel('a')] })
    assert.deepEqual(result.reactivated, ['https://a.com'])
  })

  it('keeps local values for optional fields the payload omits', async () => {
    await repos.useCase.execute({ source: 's', mode: 'partial', channels: [channel('a', { is_reference: true, provider_id: 'prov' })] })
    const result = await repos.useCase.execute({ source: 's', mode: 'partial', channels: [channel('a')] })
    assert.equal(result.statistics.channels.unchanged, 1)
    assert.equal(repos.channels[0].provider_id, 'prov')
  })
})
