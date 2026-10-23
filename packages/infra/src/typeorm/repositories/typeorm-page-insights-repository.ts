import {
  PageInsightsEntity,
  PageInsightsFilter,
  PageInsightsRepository,
  PageInsightsWithContext,
} from "@best-lap/core";
import { dataSource } from "../../database/data-source";

export class TypeormPageInsightsRepository implements PageInsightsRepository {
  async upsert(insights: PageInsightsEntity): Promise<void> {
    await dataSource.query(
      `
      INSERT INTO page_insights (page_id, collected_at, lighthouse_version, opportunities, diagnostics, field_data)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)
      ON CONFLICT (page_id) DO UPDATE SET
        collected_at = EXCLUDED.collected_at,
        lighthouse_version = EXCLUDED.lighthouse_version,
        opportunities = EXCLUDED.opportunities,
        diagnostics = EXCLUDED.diagnostics,
        field_data = EXCLUDED.field_data
      `,
      [
        insights.page_id,
        insights.collected_at,
        insights.lighthouse_version ?? null,
        JSON.stringify(insights.opportunities),
        JSON.stringify(insights.diagnostics),
        insights.field_data ? JSON.stringify(insights.field_data) : null,
      ]
    )
  }

  async list({ channelId, theme, providerId, activeOnly }: PageInsightsFilter): Promise<PageInsightsWithContext[]> {
    const conditions: string[] = []
    const params: unknown[] = []
    const add = (sql: string, value: unknown) => {
      params.push(value)
      conditions.push(sql.replace('?', `$${params.length}`))
    }

    if (channelId) add('c.id = ?', channelId)
    if (theme) add('c.theme = ?', theme)
    if (providerId) add('c.provider_id = ?', providerId)
    if (activeOnly) conditions.push('c.active = true')

    const rows = await dataSource.query(
      `
      SELECT i.page_id, i.collected_at, i.lighthouse_version, i.opportunities, i.diagnostics, i.field_data,
        p.name AS page_name, p.path AS page_path, c.id AS channel_id, c.name AS channel_name, c.theme
      FROM page_insights i
      INNER JOIN pages p ON p.id = i.page_id
      INNER JOIN channels c ON c.id = p.channel_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY c.name, p.path
      `,
      params
    )

    return rows as PageInsightsWithContext[]
  }
}
