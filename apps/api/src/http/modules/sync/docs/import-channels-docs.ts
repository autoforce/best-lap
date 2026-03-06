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
    200: {
      description: 'Import completed successfully',
      content: {
        'application/json': {
          schema: successResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad Request - Invalid request body',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
            details: z.array(z.any()),
          }),
        },
      },
    },
    500: {
      description: 'Internal Server Error - Import failed',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
}
