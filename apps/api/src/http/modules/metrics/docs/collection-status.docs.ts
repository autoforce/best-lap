import { z } from 'zod';

export const getCollectionStatusDocs = {
  schema: {
    description: 'Freshness of the collected data: last collection, next scheduled run and queue state',
    tags: ['metrics'],
    summary: 'Collection status',
    response: {
      200: z.object({
        last_collected_at: z.date().nullable(),
        next_run_at: z.date().nullable(),
        schedule: z.string(),
        strategy: z.enum(['mobile', 'desktop']),
        queue: z
          .object({
            waiting: z.number(),
            active: z.number(),
            delayed: z.number(),
            failed: z.number(),
          })
          .nullable(),
      }),
      500: z.object({
        error: z.string()
      })
    }
  }
};
