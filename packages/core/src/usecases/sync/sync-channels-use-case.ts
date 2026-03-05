import type { ChannelsRepository } from '../../modules/channel/channel-repository.interface'
import type { PageRepository } from '../../modules/page/page-repository.interface'
import type { AutoforceApiService } from '../../services/autoforce-api-service'
import type { AutoforceChannelData, SyncResult } from '../../modules/sync/autoforce-api-types'

export interface SyncChannelsUseCaseRequest {
  dryRun?: boolean // If true, only logs what would be done without making changes
}

/**
 * Use case for synchronizing channels and pages from Autoforce API
 *
 * Process:
 * 1. Fetch channels from Autoforce API
 * 2. For each channel from API:
 *    - If exists locally (by internal_link): update data and ensure active=true
 *    - If doesn't exist: create new channel
 * 3. For each local channel:
 *    - If not in API response: deactivate (active=false)
 * 4. For each page in each channel:
 *    - If exists locally (by path + channel_id): update data
 *    - If doesn't exist: create new page
 *
 * NOTE: Pages are only created/updated, never deleted or deactivated
 * to preserve historical metrics data.
 */
export class SyncChannelsUseCase {
  constructor(
    private channelsRepository: ChannelsRepository,
    private pagesRepository: PageRepository,
    private autoforceApiService: AutoforceApiService,
  ) {}

  async execute({ dryRun = false }: SyncChannelsUseCaseRequest = {}): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      timestamp: new Date(),
      statistics: {
        channels: { created: 0, updated: 0, deactivated: 0, total: 0 },
        pages: { created: 0, updated: 0, deactivated: 0, total: 0 },
      },
      errors: [],
    }

    try {
      // 1. Fetch channels from Autoforce API
      const apiResponse = await this.autoforceApiService.fetchChannels()
      const apiChannels = apiResponse.channels

      if (!apiChannels || apiChannels.length === 0) {
        console.warn('⚠️  No channels returned from Autoforce API')
        result.success = true
        return result
      }

      console.log(`📡 Fetched ${apiChannels.length} channels from Autoforce API`)

      // 2. Get all existing channels
      const existingChannels = await this.channelsRepository.listAll()
      const existingChannelsMap = new Map(
        existingChannels.map(ch => [ch.internal_link, ch])
      )

      // 3. Process each channel from API
      for (const apiChannel of apiChannels) {
        try {
          await this.syncChannel(apiChannel, existingChannelsMap, result, dryRun)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`❌ Error syncing channel ${apiChannel.internal_link}:`, errorMessage)
          result.errors?.push({
            type: 'channel',
            identifier: apiChannel.internal_link,
            error: errorMessage,
          })
        }
      }

      // 4. Deactivate channels that are no longer in API
      const apiInternalLinks = new Set(apiChannels.map(ch => ch.internal_link))
      for (const existingChannel of existingChannels) {
        if (!apiInternalLinks.has(existingChannel.internal_link) && existingChannel.active) {
          if (dryRun) {
            console.log(`[DRY RUN] Would deactivate channel: ${existingChannel.internal_link}`)
          } else {
            await this.channelsRepository.update(existingChannel.id!, { active: false })
            console.log(`🔴 Deactivated channel: ${existingChannel.internal_link}`)
          }
          result.statistics.channels.deactivated++
        }
      }

      result.statistics.channels.total = apiChannels.length
      result.success = true

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Sync failed:', errorMessage)
      result.errors?.push({
        type: 'channel',
        identifier: 'sync-process',
        error: errorMessage,
      })
      return result
    }
  }

  private async syncChannel(
    apiChannel: AutoforceChannelData,
    existingChannelsMap: Map<string, any>,
    result: SyncResult,
    dryRun: boolean,
  ): Promise<void> {
    const existingChannel = existingChannelsMap.get(apiChannel.internal_link)

    if (existingChannel) {
      // Update existing channel
      const needsUpdate =
        existingChannel.name !== apiChannel.name ||
        existingChannel.domain !== apiChannel.domain ||
        existingChannel.theme !== apiChannel.theme ||
        existingChannel.active !== apiChannel.active ||
        existingChannel.is_reference !== apiChannel.is_reference ||
        existingChannel.provider_id !== apiChannel.provider_id

      if (needsUpdate) {
        if (dryRun) {
          console.log(`[DRY RUN] Would update channel: ${apiChannel.internal_link}`)
        } else {
          await this.channelsRepository.update(existingChannel.id, {
            name: apiChannel.name,
            domain: apiChannel.domain,
            theme: apiChannel.theme,
            active: apiChannel.active,
            is_reference: apiChannel.is_reference,
            provider_id: apiChannel.provider_id,
          })
          console.log(`🔄 Updated channel: ${apiChannel.internal_link}`)
        }
        result.statistics.channels.updated++
      }

      // Sync pages for this channel
      if (apiChannel.pages && apiChannel.pages.length > 0) {
        await this.syncPages(existingChannel.id, apiChannel.pages, result, dryRun)
      }
    } else {
      // Create new channel
      if (dryRun) {
        console.log(`[DRY RUN] Would create channel: ${apiChannel.internal_link}`)
      } else {
        const newChannel = await this.channelsRepository.create({
          name: apiChannel.name,
          domain: apiChannel.domain,
          internal_link: apiChannel.internal_link,
          theme: apiChannel.theme,
          active: apiChannel.active,
          is_reference: apiChannel.is_reference,
          provider_id: apiChannel.provider_id,
        })
        console.log(`🟢 Created channel: ${apiChannel.internal_link}`)

        // Sync pages for the newly created channel
        if (apiChannel.pages && apiChannel.pages.length > 0) {
          await this.syncPages(newChannel.id!, apiChannel.pages, result, dryRun)
        }
      }
      result.statistics.channels.created++
    }
  }

  private async syncPages(
    channelId: string,
    apiPages: Array<{ name: string; path: string; provider_id?: string }>,
    result: SyncResult,
    dryRun: boolean,
  ): Promise<void> {
    // Get existing pages for this channel
    const existingPages = await this.pagesRepository.listByChannel(channelId)
    const existingPagesMap = new Map(existingPages.map(page => [page.path, page]))

    for (const apiPage of apiPages) {
      try {
        const existingPage = existingPagesMap.get(apiPage.path)

        if (existingPage) {
          // Update existing page if data changed
          const needsUpdate =
            existingPage.name !== apiPage.name ||
            existingPage.provider_id !== apiPage.provider_id

          if (needsUpdate) {
            if (dryRun) {
              console.log(`[DRY RUN] Would update page: ${apiPage.path} (channel ${channelId})`)
            } else {
              await this.pagesRepository.update(existingPage.id!, {
                name: apiPage.name,
                provider_id: apiPage.provider_id,
              })
              console.log(`  📄 Updated page: ${apiPage.path}`)
            }
            result.statistics.pages.updated++
          }
        } else {
          // Create new page
          if (dryRun) {
            console.log(`[DRY RUN] Would create page: ${apiPage.path} (channel ${channelId})`)
          } else {
            await this.pagesRepository.create({
              name: apiPage.name,
              path: apiPage.path,
              channel_id: channelId,
              provider_id: apiPage.provider_id,
            })
            console.log(`  ✅ Created page: ${apiPage.path}`)
          }
          result.statistics.pages.created++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`  ❌ Error syncing page ${apiPage.path}:`, errorMessage)
        result.errors?.push({
          type: 'page',
          identifier: `${channelId}:${apiPage.path}`,
          error: errorMessage,
        })
      }
    }

    result.statistics.pages.total += apiPages.length
  }
}
