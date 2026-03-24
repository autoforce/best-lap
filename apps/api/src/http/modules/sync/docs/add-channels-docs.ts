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

const statisticsSchema = z.object({
  channels: z.object({
    created: z.number(),
    updated: z.number(),
    total: z.number(),
  }),
  pages: z.object({
    created: z.number(),
    updated: z.number(),
    total: z.number(),
  }),
})

const errorSchema = z.object({
  type: z.enum(['channel', 'page']),
  identifier: z.string(),
  error: z.string(),
})

export const addChannelsDocs = {
  description:
    'Add channels and pages from request body. Only creates or updates — never deactivates existing channels.',
  tags: ['sync'],
  body: z.object({ channels: z.array(channelInputSchema) }),
  response: {
    200: z.object({
      message: z.string(),
      timestamp: z.date(),
      statistics: statisticsSchema,
      errors: z.array(errorSchema),
    }),
    400: z.object({
      error: z.string(),
      message: z.string(),
      details: z.array(z.any()),
    }),
    500: z.object({
      error: z.string(),
      message: z.string(),
    }),
  },
}
