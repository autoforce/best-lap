import { z } from "zod"
import { MetricEnum } from "../utils/metrics-schemas"
import { dateSchema } from "./utils/date-schema"

export const listAverageChannelMetricsDocs = {
  schema: {
    description: 'Get average metrics for a channel by period',
    tags: ['metrics'],
    params: z.object({
      channel_id: z.uuid().describe('Must be a valid channel ID'),
      period: z.enum(['hourly', 'daily', 'weekly']).describe('Must be a valid period')
    }),
    querystring: z.object({
      metric: MetricEnum.optional().describe('Must be a valid metric'),
      startDate: dateSchema.optional().describe('Date must be in YYYY-MM-DD format'),
      endDate: dateSchema.optional().describe('Date must be in YYYY-MM-DD format'),
      page_id: z.uuid().optional().describe('A page of this channel; defaults to the home page (/)')
    }),
    response: {
      200: z.object({
        metrics: z.array(z.object({
          period_start: z.date(),
          avg_score: z.number().optional(),
          avg_response_time: z.string().optional(),
          avg_fcp: z.number().optional(),
          avg_si: z.number().optional(),
          avg_lcp: z.number().optional(),
          avg_tbt: z.number().optional(),
          avg_cls: z.number().optional(),
          avg_seo: z.number().optional(),
        }))
      }),
      400: z.object({
        message: z.string()
      }),
      404: z.object({
        message: z.string()
      }),
      500: z.object({
        error: z.string()
      })
    }
  }
}