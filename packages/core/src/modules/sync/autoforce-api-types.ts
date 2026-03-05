/**
 * Types for Autoforce API integration
 *
 * NOTE: These types are based on a generic structure and should be updated
 * to match the actual API response from Autoforce.
 */

/**
 * Page data from Autoforce API
 */
export interface AutoforcePageData {
  name: string
  path: string
  provider_id?: string
}

/**
 * Channel data from Autoforce API
 */
export interface AutoforceChannelData {
  name: string
  domain: string
  internal_link: string // Unique identifier
  theme: string
  active: boolean
  is_reference?: boolean
  provider_id?: string
  pages?: AutoforcePageData[]
}

/**
 * Response from Autoforce API
 *
 * TODO: Update this structure based on actual API response format
 * Possible variations:
 * 1. Simple array: { channels: AutoforceChannelData[] }
 * 2. Paginated: { data: AutoforceChannelData[], pagination: {...} }
 * 3. Nested: { result: { channels: [...], pages: [...] } }
 */
export interface AutoforceApiResponse {
  channels: AutoforceChannelData[]
}

/**
 * Statistics from sync operation
 */
export interface SyncResult {
  success: boolean
  timestamp: Date
  statistics: {
    channels: {
      created: number
      updated: number
      deactivated: number
      total: number
    }
    pages: {
      created: number
      updated: number
      deactivated: number
      total: number
    }
  }
  errors?: Array<{
    type: 'channel' | 'page'
    identifier: string
    error: string
  }>
}
