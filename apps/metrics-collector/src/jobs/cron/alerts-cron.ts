import { env } from '@best-lap/env'
import { sendAttentionAlerts, sendWeeklyDigest } from '../alerts'
import { scheduleTask } from './schedule-task'

export const alertsCron = () => {
  if (!env.SLACK_WEBHOOK_URL) {
    console.log('⏭️  Slack alerts disabled (SLACK_WEBHOOK_URL not set)')
    return []
  }

  return [
    scheduleTask('attention-alerts', env.ALERTS_CRON, () => sendAttentionAlerts()),
    scheduleTask('weekly-digest', env.WEEKLY_DIGEST_CRON, () => sendWeeklyDigest()),
  ]
}
