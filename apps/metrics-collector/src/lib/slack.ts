import { env } from '@best-lap/env'

/** Link to a dashboard path in Slack syntax, or plain text when DASHBOARD_URL is not set */
export function dashboardLink(path: string, label: string) {
  return env.DASHBOARD_URL ? `<${env.DASHBOARD_URL.replace(/\/$/, '')}${path}|${label}>` : label
}

/** Posts a message to the Slack incoming webhook. Returns false when Slack is not configured. */
export async function postToSlack(text: string, blocks?: unknown[]): Promise<boolean> {
  if (!env.SLACK_WEBHOOK_URL) return false

  const response = await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blocks ? { text, blocks } : { text }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Slack webhook returned ${response.status}: ${await response.text().catch(() => '')}`)
  }
  return true
}
