import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ChannelNotCollectable, EnqueueCollectionUseCase } from '../src/usecases/collection/enqueue-collection-use-case'
import type { CollectPageMetricsJob } from '../src/types/metrics-queue'

const channels = [
  {
    id: 'c1',
    name: 'Client',
    internal_link: 'https://client.com/',
    active: true,
    is_reference: false,
    pages: [
      { id: 'p1', path: '/' },
      { id: 'p2', path: 'seminovos' },
    ],
  },
  { id: 'c2', name: 'Reference', internal_link: 'https://ref.com', active: true, is_reference: true, pages: [{ id: 'p3', path: '/' }] },
  { id: 'c3', name: 'No pages', internal_link: 'https://empty.com', active: true, pages: [] },
  { id: 'c4', name: 'Inactive', internal_link: 'https://off.com', active: false, pages: [{ id: 'p4', path: '/' }] },
]

function setup() {
  const sent: Array<{ jobs: CollectPageMetricsJob[]; batchKey: string }> = []
  const useCase = new EnqueueCollectionUseCase(
    {
      listActiveChannels: async () => channels.filter((c) => c.active),
      findById: async (id: string) => channels.find((c) => c.id === id) ?? null,
    } as never,
    {
      enqueueCollectJobs: async (jobs: CollectPageMetricsJob[], batchKey: string) => {
        sent.push({ jobs, batchKey })
        return jobs.length
      },
    } as never
  )
  return { useCase, sent }
}

describe('EnqueueCollectionUseCase', () => {
  it('enqueues every page of active channels with clean URLs and queue types', async () => {
    const { useCase, sent } = setup()
    const result = await useCase.execute({ scope: { kind: 'all' }, pages: 'all', batchKey: 'cron_1' })
    assert.equal(result.jobs_count, 3)
    assert.deepEqual(result.skipped, [{ channel_id: 'c3', reason: 'no_pages' }])
    assert.deepEqual(
      sent[0].jobs.map((j) => [j.pageUrl, j.type]),
      [
        ['https://client.com/', 'client'],
        ['https://client.com/seminovos', 'client'],
        ['https://ref.com/', 'reference'],
      ]
    )
    assert.equal(sent[0].batchKey, 'cron_1')
  })

  it('home mode keeps only "/"', async () => {
    const { useCase, sent } = setup()
    await useCase.execute({ scope: { kind: 'all' }, pages: 'home', batchKey: 'k' })
    assert.deepEqual(sent[0].jobs.map((j) => j.pageId), ['p1', 'p3'])
  })

  it('rejects inactive channels and pages from another channel', async () => {
    const { useCase } = setup()
    await assert.rejects(useCase.execute({ scope: { kind: 'channel', channelId: 'c4' }, pages: 'all', batchKey: 'k' }), ChannelNotCollectable)
    await assert.rejects(
      useCase.execute({ scope: { kind: 'page', channelId: 'c1', pageId: 'p3' }, pages: 'all', batchKey: 'k' }),
      ChannelNotCollectable
    )
  })
})
