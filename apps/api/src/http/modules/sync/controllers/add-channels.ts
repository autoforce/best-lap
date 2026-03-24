import { FastifyReply, FastifyRequest } from 'fastify'
import { TypeormChannelsRepository, TypeormPagesRepository } from '@best-lap/infra'
import { z } from 'zod'

const addChannelsBodySchema = z.object({
  channels: z.array(
    z.object({
      name: z.string(),
      domain: z.string(),
      internal_link: z.string(),
      theme: z.string(),
      active: z.boolean().default(true),
      is_reference: z.boolean().optional(),
      provider_id: z.string().uuid().optional(),
      pages: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
            provider_id: z.string().uuid().optional(),
          })
        )
        .optional(),
    })
  ),
})

/**
 * Adds channels and pages from request body without deactivating existing channels.
 * Unlike /sync/channels/import, this endpoint only creates or updates — never deactivates.
 */
export async function addChannels(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { channels } = addChannelsBodySchema.parse(request.body)

    console.log(`📥 Add channels triggered via API with ${channels.length} channels`)

    const channelsRepository = new TypeormChannelsRepository()
    const pagesRepository = new TypeormPagesRepository()

    const statistics = {
      channels: { created: 0, updated: 0, total: channels.length },
      pages: { created: 0, updated: 0, total: 0 },
    }
    const errors: Array<{ type: 'channel' | 'page'; identifier: string; error: string }> = []

    const existingChannels = await channelsRepository.listAll()
    const existingChannelsMap = new Map(existingChannels.map(ch => [ch.internal_link, ch]))

    for (const channel of channels) {
      try {
        const existing = existingChannelsMap.get(channel.internal_link)

        let channelId: string

        if (existing) {
          const needsUpdate =
            existing.name !== channel.name ||
            existing.domain !== channel.domain ||
            existing.theme !== channel.theme ||
            existing.active !== channel.active ||
            existing.is_reference !== channel.is_reference ||
            existing.provider_id !== channel.provider_id

          if (needsUpdate) {
            await channelsRepository.update(existing.id!, {
              name: channel.name,
              domain: channel.domain,
              theme: channel.theme,
              active: channel.active,
              is_reference: channel.is_reference,
              provider_id: channel.provider_id,
            })
            statistics.channels.updated++
          }

          channelId = existing.id!
        } else {
          const newChannel = await channelsRepository.create({
            name: channel.name,
            domain: channel.domain,
            internal_link: channel.internal_link,
            theme: channel.theme,
            active: channel.active,
            is_reference: channel.is_reference,
            provider_id: channel.provider_id,
          })
          statistics.channels.created++
          channelId = newChannel.id!
        }

        if (channel.pages && channel.pages.length > 0) {
          const existingPages = await pagesRepository.listByChannel(channelId)
          const existingPagesMap = new Map(existingPages.map(p => [p.path, p]))

          for (const page of channel.pages) {
            try {
              const existingPage = existingPagesMap.get(page.path)

              if (existingPage) {
                const needsUpdate =
                  existingPage.name !== page.name ||
                  existingPage.provider_id !== page.provider_id

                if (needsUpdate) {
                  await pagesRepository.update(existingPage.id!, {
                    name: page.name,
                    provider_id: page.provider_id,
                  })
                  statistics.pages.updated++
                }
              } else {
                await pagesRepository.create({
                  name: page.name,
                  path: page.path,
                  channel_id: channelId,
                  provider_id: page.provider_id,
                })
                statistics.pages.created++
              }

              statistics.pages.total++
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              errors.push({ type: 'page', identifier: `${channelId}:${page.path}`, error: errorMessage })
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({ type: 'channel', identifier: channel.internal_link, error: errorMessage })
      }
    }

    return reply.status(200).send({
      message: 'Channels added successfully',
      timestamp: new Date(),
      statistics,
      errors,
    })
  } catch (error) {
    console.error('❌ Add channels endpoint error:', error)

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Invalid request body',
        details: error.errors,
      })
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
