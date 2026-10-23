import { z } from 'zod'
import { bulkChannelsBodySchema } from '../schemas/bulk-channels'

const errorItemSchema = z.object({
  type: z.enum(['channel', 'page']),
  identifier: z.string(),
  error: z.string(),
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

export const bulkChannelsDocs = {
  description:
    'Bulk upsert of channels coming from an external source (e.g. a Make scenario). ' +
    'Channels are matched by internal_link and tagged with `source`. ' +
    '`partial` only creates and updates. `full` also deactivates channels of the same source that are missing from the payload; ' +
    'channels from other sources are never touched. Requires the `x-api-key` header.',
  tags: ['sync'],
  headers: z.object({ 'x-api-key': z.string() }),
  body: bulkChannelsBodySchema,
  response: {
    200: z.object({
      source: z.string(),
      mode: z.enum(['full', 'partial']),
      dry_run: z.boolean(),
      timestamp: z.date(),
      statistics: z.object({
        channels: z.object({
          received: z.number(),
          created: z.number(),
          updated: z.number(),
          unchanged: z.number(),
          reactivated: z.number(),
          deactivated: z.number(),
        }),
        pages: z.object({
          created: z.number(),
          updated: z.number(),
        }),
      }),
      created: z.array(z.string()),
      reactivated: z.array(z.string()),
      deactivated: z.array(
        z.object({
          internal_link: z.string(),
          reason: z.enum(['inactive_in_source', 'missing_from_source']),
        })
      ),
      errors: z.array(errorItemSchema),
    }),
    401: errorResponseSchema,
    422: errorResponseSchema.extend({ details: z.array(z.string()) }),
    500: errorResponseSchema,
    503: errorResponseSchema,
  },
}
