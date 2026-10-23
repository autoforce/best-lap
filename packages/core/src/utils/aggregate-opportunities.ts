import type { PageInsightsWithContext } from '../modules/insights/page-insights.interface'

export interface CommonOpportunity {
  id: string
  title: string
  description?: string
  /** Distinct channels with at least one page failing this audit */
  channels_affected: number
  pages_affected: number
  avg_savings_ms?: number
  max_savings_ms?: number
  avg_savings_bytes?: number
  /** Up to 5 channels with the biggest savings, to start from */
  top_channels: Array<{ id: string; name: string; savings_ms?: number }>
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined)

/**
 * Groups the opportunities of many pages by audit, so problems shared by a whole theme
 * (usually fixed once in the template) rise to the top.
 */
export function aggregateOpportunities(rows: PageInsightsWithContext[]): {
  channels_with_data: number
  items: CommonOpportunity[]
} {
  type AuditEntry = {
    title: string
    description?: string
    pages: number
    channels: Map<string, { name: string; savings_ms?: number }>
    ms: number[]
    bytes: number[]
  }
  const byAudit = new Map<string, AuditEntry>()

  for (const row of rows) {
    for (const finding of row.opportunities) {
      const entry: AuditEntry = byAudit.get(finding.id) ?? {
        title: finding.title,
        description: finding.description,
        pages: 0,
        channels: new Map(),
        ms: [],
        bytes: [],
      }
      entry.pages += 1
      const channel = entry.channels.get(row.channel_id)
      if (!channel || (finding.savings_ms ?? 0) > (channel.savings_ms ?? 0)) {
        entry.channels.set(row.channel_id, { name: row.channel_name, savings_ms: finding.savings_ms })
      }
      if (finding.savings_ms) entry.ms.push(finding.savings_ms)
      if (finding.savings_bytes) entry.bytes.push(finding.savings_bytes)
      byAudit.set(finding.id, entry)
    }
  }

  const items: CommonOpportunity[] = [...byAudit.entries()].map(([id, entry]) => {
    const avgMs = mean(entry.ms)
    const avgBytes = mean(entry.bytes)
    return {
      id,
      title: entry.title,
      description: entry.description,
      channels_affected: entry.channels.size,
      pages_affected: entry.pages,
      avg_savings_ms: avgMs !== undefined ? Math.round(avgMs) : undefined,
      max_savings_ms: entry.ms.length ? Math.max(...entry.ms) : undefined,
      avg_savings_bytes: avgBytes !== undefined ? Math.round(avgBytes) : undefined,
      top_channels: [...entry.channels.entries()]
        .map(([channelId, c]) => ({ id: channelId, name: c.name, savings_ms: c.savings_ms }))
        .sort((a, b) => (b.savings_ms ?? 0) - (a.savings_ms ?? 0))
        .slice(0, 5),
    }
  })

  // Most widespread first; among equally common ones, the biggest estimated saving
  items.sort((a, b) => b.channels_affected - a.channels_affected || (b.avg_savings_ms ?? 0) - (a.avg_savings_ms ?? 0))

  return {
    channels_with_data: new Set(rows.map((r) => r.channel_id)).size,
    items,
  }
}
