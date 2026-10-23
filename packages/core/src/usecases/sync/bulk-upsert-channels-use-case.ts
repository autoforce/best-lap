import type { ChannelEntity } from '../../modules/channel/channel-entity.interface'
import type { ChannelsRepository } from '../../modules/channel/channel-repository.interface'
import type { PageEntity } from '../../modules/page/page-entity.interface'
import type { PageRepository } from '../../modules/page/page-repository.interface'
import { BulkSyncRejected } from '../../errors/bulk-sync-rejected'

export type BulkSyncMode = 'full' | 'partial'

export interface BulkPageInput {
  name: string
  path: string
  provider_id?: string
}

export interface BulkChannelInput {
  name: string
  domain: string
  internal_link: string
  theme: string
  active: boolean
  is_reference?: boolean
  provider_id?: string
  pages?: BulkPageInput[]
}

export interface BulkUpsertChannelsRequest {
  source: string
  mode: BulkSyncMode
  channels: BulkChannelInput[]
  dryRun?: boolean
  force?: boolean
}

export interface BulkUpsertChannelsResult {
  source: string
  mode: BulkSyncMode
  dry_run: boolean
  timestamp: Date
  statistics: {
    channels: {
      received: number
      created: number
      updated: number
      unchanged: number
      reactivated: number
      deactivated: number
    }
    pages: {
      created: number
      updated: number
    }
  }
  created: string[]
  reactivated: string[]
  deactivated: Array<{
    internal_link: string
    reason: 'inactive_in_source' | 'missing_from_source'
  }>
  errors: Array<{
    type: 'channel' | 'page'
    identifier: string
    error: string
  }>
}

/**
 * A full sync refuses to deactivate more than this share of the source's
 * active channels, unless `force` is set. Protects against a scenario that
 * sends a truncated list (failed pagination, empty filter, etc).
 */
const MAX_DEACTIVATION_RATIO = 0.5
const MIN_DEACTIVATIONS_TO_GUARD = 5

const normalizeLink = (link: string) => link.trim().replace(/\/+$/, '')

const normalizePath = (path: string) => {
  const trimmed = path.trim()
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Upserts channels coming from an external source (e.g. a Make scenario).
 *
 * - Channels are matched by `internal_link` (trailing slashes ignored).
 * - Every channel received is tagged with `source`.
 * - `partial` mode only creates and updates.
 * - `full` mode also deactivates channels of the same `source` that are
 *   missing from the payload. Channels from other sources are never touched.
 * - Pages are created and updated, never removed, to keep metrics history.
 */
export class BulkUpsertChannelsUseCase {
  constructor(
    private channelsRepository: ChannelsRepository,
    private pagesRepository: PageRepository,
  ) {}

  async execute({
    source,
    mode,
    channels,
    dryRun = false,
    force = false,
  }: BulkUpsertChannelsRequest): Promise<BulkUpsertChannelsResult> {
    const result: BulkUpsertChannelsResult = {
      source,
      mode,
      dry_run: dryRun,
      timestamp: new Date(),
      statistics: {
        channels: { received: channels.length, created: 0, updated: 0, unchanged: 0, reactivated: 0, deactivated: 0 },
        pages: { created: 0, updated: 0 },
      },
      created: [],
      reactivated: [],
      deactivated: [],
      errors: [],
    }

    const incomingLinks = new Set<string>()
    const duplicates = new Set<string>()
    for (const channel of channels) {
      const link = normalizeLink(channel.internal_link)
      if (incomingLinks.has(link)) duplicates.add(link)
      incomingLinks.add(link)
    }

    if (duplicates.size > 0) {
      throw new BulkSyncRejected('Payload contains duplicated internal_link values.', [...duplicates])
    }

    const existingChannels = await this.channelsRepository.listAll()
    const existingByLink = new Map(existingChannels.map(ch => [normalizeLink(ch.internal_link), ch]))

    // Decide deactivations before writing anything, so a rejected sync leaves no partial changes
    const missingFromSource =
      mode === 'full'
        ? existingChannels.filter(
            ch => ch.source === source && ch.active && !incomingLinks.has(normalizeLink(ch.internal_link)),
          )
        : []

    if (missingFromSource.length > 0 && !force) {
      const activeInSource = existingChannels.filter(ch => ch.source === source && ch.active).length
      const ratio = missingFromSource.length / activeInSource

      if (missingFromSource.length >= MIN_DEACTIVATIONS_TO_GUARD && ratio > MAX_DEACTIVATION_RATIO) {
        throw new BulkSyncRejected(
          `Full sync would deactivate ${missingFromSource.length} of ${activeInSource} active channels from source "${source}". Send force=true if this is intended.`,
          missingFromSource.map(ch => ch.internal_link),
        )
      }
    }

    for (const channel of channels) {
      try {
        await this.upsertChannel(channel, existingByLink.get(normalizeLink(channel.internal_link)), source, dryRun, result)
      } catch (error) {
        result.errors.push({
          type: 'channel',
          identifier: channel.internal_link,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    for (const channel of missingFromSource) {
      try {
        if (!dryRun) {
          await this.channelsRepository.update(channel.id!, { active: false })
        }
        result.deactivated.push({ internal_link: channel.internal_link, reason: 'missing_from_source' })
        result.statistics.channels.deactivated++
      } catch (error) {
        result.errors.push({
          type: 'channel',
          identifier: channel.internal_link,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return result
  }

  private async upsertChannel(
    input: BulkChannelInput,
    existing: ChannelEntity | undefined,
    source: string,
    dryRun: boolean,
    result: BulkUpsertChannelsResult,
  ): Promise<void> {
    const { statistics } = result

    if (!existing) {
      const link = normalizeLink(input.internal_link)
      let channelId: string | undefined

      if (!dryRun) {
        const created = await this.channelsRepository.create({
          name: input.name,
          domain: input.domain,
          internal_link: link,
          theme: input.theme,
          active: input.active,
          is_reference: input.is_reference ?? false,
          provider_id: input.provider_id,
          source,
        })
        channelId = created.id
      }

      statistics.channels.created++
      result.created.push(link)
      if (!input.active) {
        statistics.channels.deactivated++
        result.deactivated.push({ internal_link: link, reason: 'inactive_in_source' })
      }

      await this.upsertPages(channelId, input.pages ?? [], [], dryRun, result)
      return
    }

    // Only fields present in the payload are compared, so an omitted optional field never overwrites local data
    const changes: Partial<ChannelEntity> = {}
    if (existing.name !== input.name) changes.name = input.name
    if (existing.domain !== input.domain) changes.domain = input.domain
    if (existing.theme !== input.theme) changes.theme = input.theme
    if (existing.active !== input.active) changes.active = input.active
    if (input.is_reference !== undefined && existing.is_reference !== input.is_reference) {
      changes.is_reference = input.is_reference
    }
    if (input.provider_id !== undefined && existing.provider_id !== input.provider_id) {
      changes.provider_id = input.provider_id
    }
    if (existing.source !== source) changes.source = source

    if (Object.keys(changes).length > 0) {
      if (!dryRun) {
        await this.channelsRepository.update(existing.id!, changes)
      }
      statistics.channels.updated++

      if (changes.active === true) {
        statistics.channels.reactivated++
        result.reactivated.push(existing.internal_link)
      }
      if (changes.active === false) {
        statistics.channels.deactivated++
        result.deactivated.push({ internal_link: existing.internal_link, reason: 'inactive_in_source' })
      }
    } else {
      statistics.channels.unchanged++
    }

    await this.upsertPages(existing.id, input.pages ?? [], existing.pages ?? [], dryRun, result)
  }

  private async upsertPages(
    channelId: string | undefined,
    pages: BulkPageInput[],
    existingPages: PageEntity[],
    dryRun: boolean,
    result: BulkUpsertChannelsResult,
  ): Promise<void> {
    const existingByPath = new Map(existingPages.map(page => [normalizePath(page.path), page]))

    for (const page of pages) {
      const path = normalizePath(page.path)

      try {
        const existing = existingByPath.get(path)

        if (!existing) {
          if (!dryRun) {
            await this.pagesRepository.create({
              name: page.name,
              path,
              channel_id: channelId!,
              provider_id: page.provider_id,
            })
          }
          existingByPath.set(path, { name: page.name, path, channel_id: channelId ?? '', provider_id: page.provider_id })
          result.statistics.pages.created++
          continue
        }

        const changes: Partial<PageEntity> = {}
        if (existing.name !== page.name) changes.name = page.name
        if (page.provider_id !== undefined && existing.provider_id !== page.provider_id) {
          changes.provider_id = page.provider_id
        }

        if (Object.keys(changes).length > 0) {
          if (!dryRun) {
            await this.pagesRepository.update(existing.id!, changes)
          }
          result.statistics.pages.updated++
        }
      } catch (error) {
        result.errors.push({
          type: 'page',
          identifier: `${channelId ?? 'new'}:${path}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }
}
