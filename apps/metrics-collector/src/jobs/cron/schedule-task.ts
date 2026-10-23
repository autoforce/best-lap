import cron, { ScheduledTask } from 'node-cron'
import { env } from '@best-lap/env'
import { acquireLock } from '@best-lap/infra'

/** Minute-resolution key for one firing of a cron task, e.g. "202610231400" */
export function slotKey(date = new Date()) {
  return date.toISOString().slice(0, 16).replace(/[-T:]/g, '')
}

/**
 * Schedules a task in CRON_TIMEZONE. A Redis lock makes each firing run once even with
 * several collector instances, and overlapping runs of the same task are skipped.
 */
export function scheduleTask(name: string, expression: string, task: (slot: string) => Promise<void>): ScheduledTask | null {
  if (!cron.validate(expression)) {
    console.error(`⚠️  Invalid cron expression for ${name}: "${expression}". Task not scheduled.`)
    return null
  }

  console.log(`📅 ${name}: "${expression}" (${env.CRON_TIMEZONE})`)

  return cron.schedule(
    expression,
    async () => {
      const slot = slotKey()
      try {
        if (!(await acquireLock(`${name}:${slot}`, 50 * 60))) {
          console.log(`⏭️  ${name} ${slot} already running on another instance`)
          return
        }
        await task(slot)
      } catch (error) {
        console.error(`❌ ${name} failed:`, error)
      }
    },
    { name, timezone: env.CRON_TIMEZONE, noOverlap: true }
  )
}
