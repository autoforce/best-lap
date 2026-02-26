import { z } from 'zod'

export const meDocs = {
  schema: {
    description: 'Get current authenticated user',
    tags: ['auth'],
    headers: z.object({
      authorization: z.string().describe('Bearer token'),
    }),
    response: {
      200: z.object({
        user: z.object({
          userId: z.string().uuid(),
          name: z.string(),
          email: z.string().email(),
        }),
      }),
      401: z.object({
        message: z.string(),
      }),
    },
  },
}
