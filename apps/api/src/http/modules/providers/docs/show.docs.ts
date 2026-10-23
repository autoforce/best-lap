import { z } from 'zod';

export const showProviderDocs = {
  schema: {
    description: 'Show provider details',
    tags: ['providers'],
    params: z.object({
      provider_id: z.uuid().describe('Provider ID')
    }),
    response: {
      200: z.object({
        provider: z.object({
          id: z.uuid().describe('Provider ID'),
          name: z.string().describe('Name of the provider'),
          website: z.string().describe('Website of the provider'),
          slug: z.string().describe('Unique slug for the provider'),
          description: z.string().nullable().optional().describe('Description of the provider'),
          created_at: z.date().describe('Creation date of the provider'),
          updated_at: z.date().optional().describe('Last update date of the provider')
        })
      }),
      404: z.object({
        error: z.string()
      }),
      500: z.object({
        error: z.string()
      })
    }
  }
}
