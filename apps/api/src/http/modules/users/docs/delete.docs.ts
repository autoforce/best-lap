import { z } from 'zod'

export const deleteUserDocs = {
  schema: {
    description: 'Delete a user',
    tags: ['users'],
    headers: z.object({
      authorization: z.string().describe('Bearer token'),
    }),
    params: z.object({
      user_id: z.string().uuid().describe('User ID'),
    }),
    response: {
      204: z.null(),
      404: z.object({
        message: z.string(),
      }),
      500: z.object({
        error: z.string(),
      }),
    },
  },
}
