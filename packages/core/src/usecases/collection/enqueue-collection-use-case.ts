import type { ChannelEntity } from '../../modules/channel/channel-entity.interface'
import type { ChannelsRepository } from '../../modules/channel/channel-repository.interface'
import type { CollectPageMetricsJob, PageMetricsQueue } from '../../types/metrics-queue'
import { ResourceNotFound } from '../../errors'

export type CollectionScope =
  | { kind: 'all' }
  | { kind: 'channel'; channelId: string }
  | { kind: 'page'; channelId: string; pageId: string }

export interface EnqueueCollectionRequest {
  scope: CollectionScope
  /** "all" collects every registered page, "home" only "/" (cheaper on the PageSpeed quota) */
  pages: 'all' | 'home'
  /** Deduplication key: same page + same key is enqueued only once */
  batchKey: string
}

export interface EnqueueCollectionResult {
  jobs_count: number
  channels_count: number
  skipped: Array<{ channel_id: string; reason: 'inactive' | 'no_url' | 'no_pages' | 'no_home' }>
}

export class ChannelNotCollectable extends Error {
  constructor(public reason: 'inactive' | 'no_url' | 'no_pages' | 'page_not_in_channel') {
    super(
      {
        inactive: 'Channel is not active',
        no_url: 'Channel does not have a URL',
        no_pages: 'Channel does not have any pages',
        page_not_in_channel: 'Page does not belong to the specified channel',
      }[reason]
    )
  }
}

const joinUrl = (base: string, path: string) => `${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`

/**
 * Single place that decides which pages get collected, used by the cron and by the
 * "collect now" buttons, so both follow the same rules.
 */
export class EnqueueCollectionUseCase {
  constructor(
    private channelsRepository: ChannelsRepository,
    private pageMetricsQueue: PageMetricsQueue,
  ) {}

  async execute({ scope, pages, batchKey }: EnqueueCollectionRequest): Promise<EnqueueCollectionResult> {
    const channels = await this.loadChannels(scope)
    const jobs: CollectPageMetricsJob[] = []
    const skipped: EnqueueCollectionResult['skipped'] = []

    for (const channel of channels) {
      if (!channel.internal_link) {
        skipped.push({ channel_id: channel.id!, reason: 'no_url' })
        continue
      }

      let channelPages = (channel.pages ?? []).filter((page) => page.path)
      if (scope.kind === 'page') channelPages = channelPages.filter((page) => page.id === scope.pageId)
      else if (pages === 'home') channelPages = channelPages.filter((page) => page.path === '/')

      if (channelPages.length === 0) {
        skipped.push({ channel_id: channel.id!, reason: pages === 'home' ? 'no_home' : 'no_pages' })
        continue
      }

      for (const page of channelPages) {
        jobs.push({
          type: channel.is_reference ? 'reference' : 'client',
          pageId: page.id!,
          pageUrl: joinUrl(channel.internal_link, page.path),
        })
      }
    }

    const jobsCount = jobs.length ? await this.pageMetricsQueue.enqueueCollectJobs(jobs, batchKey) : 0

    return {
      jobs_count: jobsCount,
      channels_count: channels.length - skipped.length,
      skipped,
    }
  }

  private async loadChannels(scope: CollectionScope): Promise<ChannelEntity[]> {
    if (scope.kind === 'all') return this.channelsRepository.listActiveChannels()

    const channel = await this.channelsRepository.findById(scope.channelId)
    if (!channel) throw new ResourceNotFound()
    if (!channel.active) throw new ChannelNotCollectable('inactive')
    if (!channel.internal_link) throw new ChannelNotCollectable('no_url')
    if (!channel.pages?.length) throw new ChannelNotCollectable('no_pages')
    if (scope.kind === 'page' && !channel.pages.some((page) => page.id === scope.pageId)) {
      throw new ChannelNotCollectable('page_not_in_channel')
    }
    return [channel]
  }
}
