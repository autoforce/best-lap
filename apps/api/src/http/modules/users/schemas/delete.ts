import { z } from 'zod'

export const deleteUserParamsSchema = z.object({
  user_id: z.string().uuid(),
})
