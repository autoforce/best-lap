import { env } from '@best-lap/env'
import { syncChannels } from '../sync-channels'
import { scheduleTask } from './schedule-task'

/**
 * Schedules the channel synchronization job to run based on SYNC_CHANNELS_CRON
 * Default: '0 2 * * *' (runs daily at 2:00 AM, CRON_TIMEZONE)
 */
export const syncChannelsCron = () => {
  if (!env.SYNC_CHANNELS_ENABLED) {
    console.log('⏭️  Channel sync cron is disabled (SYNC_CHANNELS_ENABLED=false)')
    return null
  }

  if (!env.AUTOFORCE_API_URL || !env.AUTOFORCE_API_KEY) {
    console.warn('⚠️  Channel sync cron not scheduled: AUTOFORCE_API_URL or AUTOFORCE_API_KEY not configured')
    return null
  }

  return scheduleTask('sync-channels', env.SYNC_CHANNELS_CRON, () => syncChannels())
}
