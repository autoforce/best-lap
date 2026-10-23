import { z } from 'zod';

export const listProvidersDocs = {
  schema: {
    description: 'List all providers',
    tags: ['providers'],
    response: {
      200: z.object({
        providers_count: z.number().describe('Total number of providers'),
        providers: z.array(z.object({
          id: z.uuid().describe('Provider ID'),
          name: z.string().describe('Name of the provider'),
          website: z.string().describe('Website of the provider'),
          slug: z.string().describe('Unique slug for the provider'),
          description: z.string().nullable().optional().describe('Description of the provider'),
          created_at: z.date().describe('Creation date of the provider'),
          updated_at: z.date().optional().describe('Last update date of the provider')
        })).describe('List of providers')
      }).describe('List of providers with their details'),
      500: z.object({
        error: z.string()
      })
    }
  }
}
