import { z } from 'zod'

const channelInputSchema = z.object({
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

const importRequestSchema = z.object({
  channels: z.array(channelInputSchema),
})

const syncStatisticsSchema = z.object({
  channels: z.object({
    created: z.number(),
    updated: z.number(),
    deactivated: z.number(),
    total: z.number(),
  }),
  pages: z.object({
    created: z.number(),
    updated: z.number(),
    deactivated: z.number(),
    total: z.number(),
  }),
})

const syncErrorSchema = z.object({
  type: z.enum(['channel', 'page']),
  identifier: z.string(),
  error: z.string(),
})

const successResponseSchema = z.object({
  message: z.string(),
  timestamp: z.date(),
  statistics: syncStatisticsSchema,
  errors: z.array(syncErrorSchema),
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  timestamp: z.date().optional(),
  statistics: syncStatisticsSchema.optional(),
  errors: z.array(syncErrorSchema).optional(),
})

export const importChannelsDocs = {
  description: 'Import channels and pages directly from request body (useful for initial data import or testing)',
  tags: ['sync'],
  body: importRequestSchema,
  response: {
    200: successResponseSchema.describe('Import completed successfully'),
    400: z
      .object({
        error: z.string(),
        message: z.string(),
        details: z.array(z.any()),
      })
      .describe('Bad Request - Invalid request body'),
    500: errorResponseSchema.describe('Internal Server Error - Import failed'),
  },
}
