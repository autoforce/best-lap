import { AttentionItem, GetAttentionItemsUseCase, GetPortfolioSummaryUseCase } from '@best-lap/core'
import { TypeormMetricsRepository, markOnce } from '@best-lap/infra'
import { dashboardLink, postToSlack } from '../lib/slack'

// An open problem is reported again at most every 3 days
const REPEAT_AFTER_SECONDS = 3 * 24 * 3600
const MAX_ITEMS_PER_MESSAGE = 15

function itemLine(item: AttentionItem) {
  const icon = item.severity === 'poor' ? '🔴' : '🟠'
  const title = item.channel_id
    ? dashboardLink(`/channels/${item.channel_id}`, item.title)
    : item.theme
      ? dashboardLink(`/themes/${encodeURIComponent(item.theme)}`, item.title)
      : item.title
  return `${icon} *${title}*\n${item.detail}`
}

/** Sends new attention items (regressions, metrics that became poor, missing collections) to Slack */
export async function sendAttentionAlerts() {
  const { items } = await new GetAttentionItemsUseCase(new TypeormMetricsRepository()).execute()

  const fresh: AttentionItem[] = []
  for (const item of items) {
    if (await markOnce(`alert:${item.id}`, REPEAT_AFTER_SECONDS)) fresh.push(item)
  }

  if (fresh.length === 0) {
    console.log(`🔕 No new attention items (${items.length} already reported)`)
    return
  }

  const shown = fresh.slice(0, MAX_ITEMS_PER_MESSAGE)
  const more = fresh.length - shown.length
  const text = [
    `*Best Lap: ${fresh.length} ${fresh.length === 1 ? 'item precisa' : 'itens precisam'} de atenção*`,
    ...shown.map(itemLine),
    more > 0 ? `…e mais ${more}. ${dashboardLink('/', 'Ver no dashboard')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const sent = await postToSlack(text)
  console.log(sent ? `🔔 ${fresh.length} alerts sent to Slack` : `🔕 SLACK_WEBHOOK_URL not set; ${fresh.length} alerts not sent`)
}

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 100)}%`)
const pts = (value: number | null) => (value === null ? '—' : String(Math.round(value)))
const trend = (now: number | null, before: number | null, unit: string) => {
  if (now === null || before === null) return ''
  const diff = Math.round(now - before)
  return diff === 0 ? ' (estável)' : ` (${diff > 0 ? '+' : '−'}${Math.abs(diff)}${unit} na semana)`
}

/** Monday summary: portfolio score, share of good sites and the biggest changes of the week */
export async function sendWeeklyDigest() {
  const repo = new TypeormMetricsRepository()
  const summary = await new GetPortfolioSummaryUseCase(repo).execute()
  const { items } = await new GetAttentionItemsUseCase(repo).execute()

  const lines = [
    '*Best Lap: resumo da semana*',
    `Score mediano: *${pts(summary.median_score)}*${trend(summary.median_score, summary.median_score_previous, ' pts')}`,
    `Sites na faixa Bom: *${pct(summary.good_share)}*${
      summary.good_share !== null && summary.good_share_previous !== null
        ? trend(summary.good_share * 100, summary.good_share_previous * 100, ' p.p.')
        : ''
    }`,
    `${summary.channels_with_data} canais com dados nos últimos 7 dias.`,
  ]

  if (summary.declined.length) {
    lines.push('', '*Maiores quedas*', ...summary.declined.map((c) => `• ${dashboardLink(`/channels/${c.channel_id}`, c.channel_name)}: ${c.from} → ${c.to}`))
  }
  if (summary.improved.length) {
    lines.push('', '*Maiores melhoras*', ...summary.improved.map((c) => `• ${dashboardLink(`/channels/${c.channel_id}`, c.channel_name)}: ${c.from} → ${c.to}`))
  }
  if (items.length) {
    lines.push('', `${items.length} ${items.length === 1 ? 'item precisa' : 'itens precisam'} de atenção agora. ${dashboardLink('/', 'Abrir o dashboard')}`)
  }

  const sent = await postToSlack(lines.join('\n'))
  console.log(sent ? '📰 Weekly digest sent to Slack' : '🔕 SLACK_WEBHOOK_URL not set; weekly digest not sent')
}
