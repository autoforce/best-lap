import type { MetricsRepository } from '../../modules/metric/metrics-repository.interface'
import { queryChannelWindows, utcDaysAgo, type ChannelWindowRow } from './channel-windows'

export type AttentionSeverity = 'poor' | 'warn'
export type AttentionKind = 'theme_regression' | 'regression' | 'entered_poor' | 'stale' | 'no_home'

export interface AttentionItem {
  /** Stable id, used to avoid sending the same alert twice */
  id: string
  kind: AttentionKind
  severity: AttentionSeverity
  title: string
  detail: string
  channel_id?: string
  channel_name?: string
  theme?: string
  metric?: 'score' | 'lcp' | 'cls'
  current?: number
  baseline?: number
  /** For grouped items (theme regressions, many stale channels) */
  channels?: Array<{ id: string; name: string }>
}

export interface StaleChannelRow {
  channel_id: string
  channel_name: string
  last_collected_at: Date | null
}

export interface AttentionRules {
  /** Score drop (points) that counts as a regression */
  regressionPoints: number
  /** Score drop that makes a regression critical */
  criticalPoints: number
  /** Regressed channels in the same theme that point to a template change */
  themeRegressionChannels: number
  /** Hours without a collection before a channel is flagged */
  staleHours: number
  /** Above this many, individual items of the same kind are grouped into one */
  groupAbove: number
}

export const DEFAULT_ATTENTION_RULES: AttentionRules = {
  regressionPoints: 10,
  criticalPoints: 20,
  themeRegressionChannels: 3,
  staleHours: 36,
  groupAbove: 5,
}

const LCP_POOR = 4000
const CLS_POOR = 0.25

const seconds = (ms: number) => `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`
const cls = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const KIND_ORDER: AttentionKind[] = ['theme_regression', 'regression', 'entered_poor', 'stale', 'no_home']

/**
 * Pure rules that turn per-channel windows into attention items. Kept separate from the
 * queries so the rules can be tested and reused by the Slack alerts.
 */
export function buildAttentionItems(
  windows: ChannelWindowRow[],
  stale: StaleChannelRow[],
  withoutHome: Array<{ channel_id: string; channel_name: string }>,
  rules: AttentionRules = DEFAULT_ATTENTION_RULES,
  now = new Date()
): AttentionItem[] {
  const items: AttentionItem[] = []
  const regressionsByTheme = new Map<string, Array<{ id: string; name: string; drop: number }>>()

  for (const w of windows) {
    if (w.recent_score !== null && w.baseline_score !== null) {
      const drop = Math.round(w.baseline_score - w.recent_score)
      if (drop >= rules.regressionPoints) {
        const lcpPart =
          w.recent_lcp !== null && w.baseline_lcp !== null ? ` · LCP ${seconds(w.baseline_lcp)} → ${seconds(w.recent_lcp)}` : ''
        items.push({
          id: `regression:${w.channel_id}`,
          kind: 'regression',
          severity: drop >= rules.criticalPoints || w.recent_score < 50 ? 'poor' : 'warn',
          title: `${w.channel_name} caiu ${drop} pontos`,
          detail: `Score ${Math.round(w.baseline_score)} → ${Math.round(w.recent_score)} (7 dias anteriores → últimos 2 dias)${lcpPart}`,
          channel_id: w.channel_id,
          channel_name: w.channel_name,
          theme: w.theme,
          metric: 'score',
          current: w.recent_score,
          baseline: w.baseline_score,
        })
        const list = regressionsByTheme.get(w.theme) ?? []
        list.push({ id: w.channel_id, name: w.channel_name, drop })
        regressionsByTheme.set(w.theme, list)
      }
    }

    if (w.recent_lcp !== null && w.baseline_lcp !== null && w.recent_lcp > LCP_POOR && w.baseline_lcp <= LCP_POOR) {
      items.push({
        id: `entered_poor:lcp:${w.channel_id}`,
        kind: 'entered_poor',
        severity: 'poor',
        title: `${w.channel_name} entrou na faixa Ruim em LCP`,
        detail: `LCP ${seconds(w.baseline_lcp)} → ${seconds(w.recent_lcp)}. O limite do Google é 4,0 s.`,
        channel_id: w.channel_id,
        channel_name: w.channel_name,
        theme: w.theme,
        metric: 'lcp',
        current: w.recent_lcp,
        baseline: w.baseline_lcp,
      })
    }

    if (w.recent_cls !== null && w.baseline_cls !== null && w.recent_cls > CLS_POOR && w.baseline_cls <= CLS_POOR) {
      items.push({
        id: `entered_poor:cls:${w.channel_id}`,
        kind: 'entered_poor',
        severity: 'poor',
        title: `${w.channel_name} entrou na faixa Ruim em CLS`,
        detail: `CLS ${cls(w.baseline_cls)} → ${cls(w.recent_cls)}. O limite do Google é 0,25.`,
        channel_id: w.channel_id,
        channel_name: w.channel_name,
        theme: w.theme,
        metric: 'cls',
        current: w.recent_cls,
        baseline: w.baseline_cls,
      })
    }
  }

  // Many sites of one theme getting worse together usually means a template release
  for (const [theme, channels] of regressionsByTheme) {
    if (channels.length < rules.themeRegressionChannels) continue
    const avgDrop = Math.round(channels.reduce((sum, c) => sum + c.drop, 0) / channels.length)
    items.push({
      id: `theme_regression:${theme}`,
      kind: 'theme_regression',
      severity: 'poor',
      title: `${channels.length} sites do tema ${theme} pioraram ao mesmo tempo`,
      detail: `Queda média de ${avgDrop} pontos. Quando vários sites do mesmo tema caem juntos, a causa costuma ser uma mudança no template.`,
      theme,
      channels: channels.map(({ id, name }) => ({ id, name })),
    })
  }

  const staleItems: AttentionItem[] = stale.map((s) => {
    const hours = s.last_collected_at ? Math.floor((now.getTime() - s.last_collected_at.getTime()) / 3_600_000) : null
    return {
      id: `stale:${s.channel_id}`,
      kind: 'stale',
      severity: 'warn',
      title: hours === null ? `${s.channel_name} sem coleta nos últimos 14 dias` : `${s.channel_name} sem coleta há ${hours} horas`,
      detail: 'O PageSpeed Insights pode estar falhando para este site, ou o domínio está fora do ar.',
      channel_id: s.channel_id,
      channel_name: s.channel_name,
    }
  })
  if (staleItems.length > rules.groupAbove) {
    items.push({
      id: 'stale:many',
      kind: 'stale',
      severity: 'warn',
      title: `${staleItems.length} sites sem coleta há mais de ${rules.staleHours} horas`,
      detail: 'Pode ser falha do coletor, da cota do PageSpeed Insights ou dos próprios sites.',
      channels: stale.map((s) => ({ id: s.channel_id, name: s.channel_name })),
    })
  } else {
    items.push(...staleItems)
  }

  const homeItems: AttentionItem[] = withoutHome.map((c) => ({
    id: `no_home:${c.channel_id}`,
    kind: 'no_home',
    severity: 'warn',
    title: `${c.channel_name} não tem a home cadastrada`,
    detail: 'Sem a página "/", o canal não entra nas médias nem no ranking.',
    channel_id: c.channel_id,
    channel_name: c.channel_name,
  }))
  if (homeItems.length > rules.groupAbove) {
    items.push({
      id: 'no_home:many',
      kind: 'no_home',
      severity: 'warn',
      title: `${homeItems.length} canais ativos sem a home cadastrada`,
      detail: 'Sem a página "/", esses canais não entram nas médias nem no ranking.',
      channels: withoutHome.map((c) => ({ id: c.channel_id, name: c.channel_name })),
    })
  } else {
    items.push(...homeItems)
  }

  const magnitude = (item: AttentionItem) =>
    item.channels?.length ?? (item.baseline !== undefined && item.current !== undefined ? Math.abs(item.baseline - item.current) : 0)

  return items.sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === 'poor' ? -1 : 1) ||
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      magnitude(b) - magnitude(a)
  )
}

/** What changed and needs a look: regressions, metrics that became poor, missing collections */
export class GetAttentionItemsUseCase {
  constructor(private metricsRepository: MetricsRepository) {}

  async execute({ providerId, rules = DEFAULT_ATTENTION_RULES, now = new Date() }: { providerId?: string; rules?: AttentionRules; now?: Date } = {}) {
    const windows = await queryChannelWindows(this.metricsRepository, {
      recentStart: utcDaysAgo(1, now),
      baselineStart: utcDaysAgo(8, now),
      providerId,
    })

    const providerFilter = providerId ? 'AND c.provider_id = $2' : ''
    const staleParams: unknown[] = [new Date(now.getTime() - rules.staleHours * 3_600_000)]
    if (providerId) staleParams.push(providerId)

    const staleRows = (await this.metricsRepository.query(
      `
      SELECT c.id AS channel_id, c.name AS channel_name, MAX(m.time) AS last_collected_at
      FROM channels c
      INNER JOIN pages p ON p.channel_id = c.id AND p.path = '/'
      LEFT JOIN metrics m ON m.page_id = p.id AND m.time > now() - INTERVAL '14 days'
      WHERE c.active = true ${providerFilter}
      GROUP BY c.id, c.name
      HAVING MAX(m.time) IS NULL OR MAX(m.time) < $1
      `,
      staleParams
    )) as Array<{ channel_id: string; channel_name: string; last_collected_at: Date | string | null }>

    const withoutHome = (await this.metricsRepository.query(
      `
      SELECT c.id AS channel_id, c.name AS channel_name
      FROM channels c
      WHERE c.active = true ${providerId ? 'AND c.provider_id = $1' : ''}
        AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.channel_id = c.id AND p.path = '/')
      `,
      providerId ? [providerId] : []
    )) as Array<{ channel_id: string; channel_name: string }>

    const stale = staleRows.map((row) => ({
      channel_id: row.channel_id,
      channel_name: row.channel_name,
      last_collected_at: row.last_collected_at ? new Date(row.last_collected_at) : null,
    }))

    return {
      generated_at: now,
      items: buildAttentionItems(windows, stale, withoutHome, rules, now),
    }
  }
}
