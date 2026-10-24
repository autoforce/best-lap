import { z } from 'zod'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
const errorSchema = z.object({ error: z.string() })
// Findings are stored as JSON and change shape with Lighthouse versions
const looseObject = z.record(z.string(), z.any())

export const attentionDocs = {
  schema: {
    description: 'Things that changed and need a look: regressions, metrics that became poor, missing collections',
    tags: ['insights'],
    querystring: z.object({ provider_id: z.uuid().optional() }),
    response: {
      200: z.object({ generated_at: z.date(), items: z.array(looseObject) }),
      500: errorSchema,
    },
  },
}

export const opportunitiesDocs = {
  schema: {
    description: 'Lighthouse opportunities shared by many channels, optionally filtered by theme or provider',
    tags: ['insights'],
    querystring: z.object({ theme: z.string().optional(), provider_id: z.uuid().optional() }),
    response: {
      200: z.object({ channels_with_data: z.number(), items: z.array(looseObject) }),
      500: errorSchema,
    },
  },
}

export const channelInsightsDocs = {
  schema: {
    description: 'Latest Lighthouse findings (opportunities, diagnostics, real-user data) for every page of a channel',
    tags: ['insights'],
    params: z.object({ channel_id: z.uuid() }),
    response: {
      200: z.object({ pages: z.array(looseObject) }),
      500: errorSchema,
    },
  },
}

export const channelPagesMetricsDocs = {
  schema: {
    description: 'Average metrics of every page of a channel, grouped by period',
    tags: ['insights'],
    params: z.object({ channel_id: z.uuid(), period: z.enum(['hourly', 'daily', 'weekly']) }),
    querystring: z.object({ startDate: dateSchema.optional(), endDate: dateSchema.optional() }),
    response: {
      200: z.object({ metrics: z.array(looseObject) }),
      500: errorSchema,
    },
  },
}

export const pageDiagnosisDocs = {
  schema: {
    description:
      'Diagnosis of one page from its daily snapshots: rule-based recommendations, what changed in the last week and the daily weight',
    tags: ['insights'],
    params: z.object({ page_id: z.uuid() }),
    response: {
      200: z.object({
        current: looseObject.nullable(),
        previous: looseObject.nullable(),
        changes: z.array(looseObject),
        recommendations: z.array(looseObject),
        history: z.array(looseObject),
      }),
      500: errorSchema,
    },
  },
}

export const groupDiagnosisDocs = {
  schema: {
    description:
      'Files, third parties and LCP patterns shared by the active sites of a theme or provider (latest snapshot of each home), with rule-based recommendations',
    tags: ['insights'],
    querystring: z.object({ theme: z.string().optional(), provider_id: z.uuid().optional() }),
    response: {
      200: z.object({
        channels_with_data: z.number(),
        resources: z.array(looseObject),
        third_parties: z.array(looseObject),
        lcp: looseObject,
        weight: looseObject,
        recommendations: z.array(looseObject),
      }),
      500: errorSchema,
    },
  },
}
