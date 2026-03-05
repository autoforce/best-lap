import { env } from '@best-lap/env'
import { AutoforceApiService } from '@best-lap/core/services/autoforce-api-service'
import { SyncChannelsUseCase } from '@best-lap/core/usecases/sync/sync-channels-use-case'
import { TypeormChannelsRepository } from '@best-lap/infra/typeorm/repositories/typeorm-channels-repository'
import { TypeormPagesRepository } from '@best-lap/infra/typeorm/repositories/typeorm-pages-repository'

/**
 * Job for synchronizing channels from Autoforce API
 */
export const syncChannels = async (): Promise<void> => {
  // Check if sync is enabled
  if (!env.SYNC_CHANNELS_ENABLED) {
    console.log('⏭️  Channel sync is disabled (SYNC_CHANNELS_ENABLED=false)')
    return
  }

  // Check if API credentials are configured
  if (!env.AUTOFORCE_API_URL || !env.AUTOFORCE_API_KEY) {
    console.warn('⚠️  Channel sync skipped: AUTOFORCE_API_URL or AUTOFORCE_API_KEY not configured')
    return
  }

  console.log('🔄 Starting channel synchronization...')
  const startTime = Date.now()

  try {
    // Initialize services
    const autoforceApiService = new AutoforceApiService({
      apiUrl: env.AUTOFORCE_API_URL,
      apiKey: env.AUTOFORCE_API_KEY,
    })

    const channelsRepository = new TypeormChannelsRepository()
    const pagesRepository = new TypeormPagesRepository()

    const syncChannelsUseCase = new SyncChannelsUseCase(
      channelsRepository,
      pagesRepository,
      autoforceApiService,
    )

    // Execute synchronization
    const result = await syncChannelsUseCase.execute()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    if (result.success) {
      console.log('✅ Channel synchronization completed successfully')
      console.log(`⏱️  Duration: ${duration}s`)
      console.log('📊 Statistics:')
      console.log(`  Channels: ${result.statistics.channels.created} created, ${result.statistics.channels.updated} updated, ${result.statistics.channels.deactivated} deactivated`)
      console.log(`  Pages: ${result.statistics.pages.created} created, ${result.statistics.pages.updated} updated`)

      if (result.errors && result.errors.length > 0) {
        console.warn(`⚠️  ${result.errors.length} errors occurred during sync:`)
        result.errors.forEach(error => {
          console.warn(`  - [${error.type}] ${error.identifier}: ${error.error}`)
        })
      }
    } else {
      console.error('❌ Channel synchronization failed')
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.error(`  - [${error.type}] ${error.identifier}: ${error.error}`)
        })
      }
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.error('❌ Channel synchronization failed with unexpected error:')
    console.error(error)
    console.log(`⏱️  Duration: ${duration}s`)
  }
}
