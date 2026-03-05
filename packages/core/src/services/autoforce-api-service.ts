import type { AutoforceApiResponse } from '../modules/sync/autoforce-api-types'

export interface AutoforceApiServiceConfig {
  apiUrl: string
  apiKey: string
}

/**
 * Service for interacting with Autoforce API
 */
export class AutoforceApiService {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor(config: AutoforceApiServiceConfig) {
    this.apiUrl = config.apiUrl
    this.apiKey = config.apiKey
  }

  /**
   * Fetches all channels and their pages from Autoforce API
   * @throws Error if API request fails
   */
  async fetchChannels(): Promise<AutoforceApiResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(
          `Autoforce API request failed: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      // TODO: Add validation/transformation if needed
      // For now, assume the API returns the expected format
      return data as AutoforceApiResponse
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch channels from Autoforce: ${error.message}`)
      }
      throw new Error('Failed to fetch channels from Autoforce: Unknown error')
    }
  }

  /**
   * Validates the API connection
   * @returns true if API is reachable and credentials are valid
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchChannels()
      return true
    } catch {
      return false
    }
  }
}
