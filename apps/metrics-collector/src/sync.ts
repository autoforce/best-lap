import { connectToDatabase } from '@best-lap/infra'
import { syncChannels } from './jobs/sync-channels'

/**
 * Manual sync script
 * Run with: pnpm --filter=@best-lap/metrics-collector sync
 */
async function initSync() {
  try {
    await connectToDatabase()
  } catch (error) {
    console.error('❌ Error connecting to database:', error)
    process.exit(1)
  }

  try {
    console.log('🚀 Starting manual channel synchronization...')
    await syncChannels()
    console.log('✅ Sync completed successfully')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error during sync execution:', err)
    process.exit(1)
  }
}

initSync()
