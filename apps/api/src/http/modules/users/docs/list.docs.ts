import { z } from 'zod'

export const listUsersDocs = {
  schema: {
    description: 'List all users',
    tags: ['users'],
    headers: z.object({
      authorization: z.string().describe('Bearer token'),
    }),
    response: {
      200: z.object({
        users: z.array(
          z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string().email(),
            created_at: z.date(),
          })
        ),
      }),
      500: z.object({
        error: z.string(),
      }),
    },
  },
}
