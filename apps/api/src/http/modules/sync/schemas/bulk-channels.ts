import { z } from 'zod'

const bulkPageSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  provider_id: z.uuid().optional(),
})

const bulkChannelSchema = z.object({
  name: z.string().min(1),
  domain: z.string(),
  internal_link: z.string().min(1),
  theme: z.string().min(1),
  active: z.boolean(),
  is_reference: z.boolean().optional(),
  provider_id: z.uuid().optional(),
  pages: z.array(bulkPageSchema).optional(),
})

export const bulkChannelsBodySchema = z.object({
  source: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'source must be a lowercase slug, e.g. "autodromo-classico"'),
  mode: z.enum(['full', 'partial']).default('partial'),
  dry_run: z.boolean().default(false),
  force: z.boolean().default(false),
  channels: z.array(bulkChannelSchema).min(1).max(5000),
})

export type BulkChannelsBody = z.infer<typeof bulkChannelsBodySchema>
