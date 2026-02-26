import { z } from 'zod'

export const loginDocs = {
  schema: {
    description: 'Authenticate user and receive JWT token',
    tags: ['auth'],
    body: z.object({
      email: z.string().email().describe('User email'),
      password: z.string().min(6).describe('User password'),
    }),
    response: {
      200: z.object({
        user: z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string().email(),
        }),
        token: z.string().describe('JWT token'),
      }),
      401: z.object({
        message: z.string(),
      }),
    },
  },
}
