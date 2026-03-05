import { z } from 'zod'

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

export const triggerSyncDocs = {
  description: 'Manually trigger synchronization of channels and pages from Autoforce API',
  tags: ['sync'],
  response: {
    200: {
      description: 'Synchronization completed successfully',
      content: {
        'application/json': {
          schema: successResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal Server Error - Synchronization failed',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    503: {
      description: 'Service Unavailable - Sync disabled or not configured',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
}
