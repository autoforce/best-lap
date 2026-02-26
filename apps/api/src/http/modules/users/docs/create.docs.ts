import { z } from 'zod'

export const createUserDocs = {
  schema: {
    description: 'Create a new user (Admin only)',
    tags: ['users'],
    headers: z.object({
      authorization: z.string().describe('Bearer token'),
    }),
    body: z.object({
      name: z.string().describe('User name'),
      email: z.string().email().describe('User email'),
      password: z.string().describe('User password'),
    }),
    response: {
      201: z.object({
        user: z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string().email(),
        }),
      }),
      409: z.object({
        message: z.string(),
      }),
      500: z.object({
        error: z.string(),
      }),
    },
  },
}
