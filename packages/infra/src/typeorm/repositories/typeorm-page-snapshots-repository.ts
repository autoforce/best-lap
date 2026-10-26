import {
  GroupResource,
  PageSnapshot,
  PageSnapshotsRepository,
  PageWeightPoint,
  SnapshotGroupAggregate,
  SnapshotGroupFilter,
} from "@best-lap/core";
import { dataSource } from "../../database/data-source";

const SNAPSHOT_COLUMNS = `
  page_id, to_char(day, 'YYYY-MM-DD') AS day, collected_at, total_bytes, request_count,
  bytes_by_type, third_parties, resources, lcp, checks
`;

// Main-thread time of the third parties of a snapshot row (the site and the platform excluded)
const THIRD_PARTY_MS = `
  COALESCE((
    SELECT sum((t->>'main_thread_ms')::numeric)
    FROM jsonb_array_elements(third_parties) t
    WHERE COALESCE((t->>'own')::boolean, false) = false
  ), 0)
`;

const TYPES = ['image', 'script', 'font', 'stylesheet', 'document', 'media', 'other'];

const orUndefined = (value: number | null) => (value === null ? undefined : value);

function toSnapshot(row: Record<string, unknown>): PageSnapshot {
  return {
    page_id: row.page_id as string,
    day: row.day as string,
    collected_at: row.collected_at as Date,
    total_bytes: orUndefined(row.total_bytes as number | null),
    request_count: orUndefined(row.request_count as number | null),
    bytes_by_type: (row.bytes_by_type ?? {}) as PageSnapshot['bytes_by_type'],
    third_parties: (row.third_parties ?? []) as PageSnapshot['third_parties'],
    resources: (row.resources ?? []) as PageSnapshot['resources'],
    lcp: (row.lcp ?? null) as PageSnapshot['lcp'],
    checks: (row.checks ?? {}) as PageSnapshot['checks'],
  };
}

export class TypeormPageSnapshotsRepository implements PageSnapshotsRepository {
  async upsert(snapshot: PageSnapshot): Promise<void> {
    await dataSource.query(
      `
      INSERT INTO page_snapshots
        (page_id, day, collected_at, total_bytes, request_count, bytes_by_type, third_parties, resources, lcp, checks)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb)
      ON CONFLICT (page_id, day) DO UPDATE SET
        collected_at = EXCLUDED.collected_at,
        total_bytes = EXCLUDED.total_bytes,
        request_count = EXCLUDED.request_count,
        bytes_by_type = EXCLUDED.bytes_by_type,
        third_parties = EXCLUDED.third_parties,
        resources = EXCLUDED.resources,
        lcp = EXCLUDED.lcp,
        checks = EXCLUDED.checks
      `,
      [
        snapshot.page_id,
        snapshot.day,
        snapshot.collected_at,
        snapshot.total_bytes ?? null,
        snapshot.request_count ?? null,
        JSON.stringify(snapshot.bytes_by_type),
        JSON.stringify(snapshot.third_parties),
        JSON.stringify(snapshot.resources),
        snapshot.lcp ? JSON.stringify(snapshot.lcp) : null,
        JSON.stringify(snapshot.checks),
      ]
    );
  }

  async findLatest(pageId: string, onOrBefore?: string): Promise<PageSnapshot | null> {
    const rows = await dataSource.query(
      `
      SELECT ${SNAPSHOT_COLUMNS} FROM page_snapshots
      WHERE page_id = $1 ${onOrBefore ? 'AND day <= $2' : ''}
      ORDER BY day DESC LIMIT 1
      `,
      onOrBefore ? [pageId, onOrBefore] : [pageId]
    );
    return rows[0] ? toSnapshot(rows[0]) : null;
  }

  async findOldestAfter(pageId: string, after: string): Promise<PageSnapshot | null> {
    const rows = await dataSource.query(
      `SELECT ${SNAPSHOT_COLUMNS} FROM page_snapshots WHERE page_id = $1 AND day > $2 ORDER BY day ASC LIMIT 1`,
      [pageId, after]
    );
    return rows[0] ? toSnapshot(rows[0]) : null;
  }

  async history(pageId: string, days: number): Promise<PageWeightPoint[]> {
    const rows = await dataSource.query(
      `
      SELECT to_char(day, 'YYYY-MM-DD') AS day, total_bytes, request_count, bytes_by_type,
        round(${THIRD_PARTY_MS})::int AS third_party_ms
      FROM page_snapshots
      WHERE page_id = $1 AND day >= current_date - $2::int
      ORDER BY day
      `,
      [pageId, days]
    );
    return rows;
  }

  /**
   * Latest snapshot (last 3 days) of the home page of each active channel of the group,
   * grouped by file, by third party, and summarized for LCP and weight.
   */
  async aggregateGroup({ theme, providerId }: SnapshotGroupFilter): Promise<SnapshotGroupAggregate> {
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (theme) {
      params.push(theme);
      conditions.push(`c.theme = $${params.length}`);
    }
    if (providerId) {
      params.push(providerId);
      conditions.push(`c.provider_id = $${params.length}`);
    }

    const latest = `
      WITH latest AS (
        SELECT DISTINCT ON (c.id) s.*, c.id AS channel_id, c.name AS channel_name
        FROM page_snapshots s
        INNER JOIN pages p ON p.id = s.page_id AND p.path = '/'
        INNER JOIN channels c ON c.id = p.channel_id AND c.active = true
        WHERE s.day >= current_date - 3 ${conditions.map((c) => `AND ${c}`).join(' ')}
        ORDER BY c.id, s.day DESC
      )
    `;

    const [resources, thirdParties, summaryRows] = await Promise.all([
      dataSource.query(
        `
        ${latest},
        per_channel AS (
          SELECT l.channel_id, l.channel_name, r->>'key' AS key,
            max(r->>'entity') AS entity,
            bool_or(COALESCE((r->>'own')::boolean, false)) AS own,
            jsonb_agg(DISTINCT r->>'audit') AS audits,
            max((r->>'wasted_ms')::numeric) AS wasted_ms,
            max((r->>'wasted_bytes')::numeric) AS wasted_bytes,
            max((r->>'total_bytes')::numeric) AS total_bytes
          FROM latest l
          CROSS JOIN LATERAL jsonb_array_elements(l.resources) r
          GROUP BY l.channel_id, l.channel_name, r->>'key'
        )
        SELECT key, max(entity) AS entity, bool_or(own) AS own, jsonb_agg(audits) AS audits,
          count(*)::int AS channels,
          round(avg(wasted_ms))::int AS avg_wasted_ms,
          round(avg(wasted_bytes))::int AS avg_wasted_bytes,
          round(avg(total_bytes))::int AS avg_total_bytes,
          jsonb_agg(jsonb_build_object('id', channel_id, 'name', channel_name)
            ORDER BY COALESCE(wasted_ms, 0) DESC, COALESCE(wasted_bytes, 0) DESC, COALESCE(total_bytes, 0) DESC) AS top_channels
        FROM per_channel
        GROUP BY key
        HAVING count(*) >= 2
        ORDER BY count(*) DESC, avg(wasted_ms) DESC NULLS LAST, avg(wasted_bytes) DESC NULLS LAST
        LIMIT 40
        `,
        params
      ),
      dataSource.query(
        `
        ${latest}
        SELECT t->>'entity' AS entity, max(t->>'category') AS category,
          count(DISTINCT l.channel_id)::int AS channels,
          round(avg((t->>'main_thread_ms')::numeric))::int AS avg_main_thread_ms,
          round(avg((t->>'bytes')::numeric))::int AS avg_bytes
        FROM latest l
        CROSS JOIN LATERAL jsonb_array_elements(l.third_parties) t
        WHERE COALESCE((t->>'own')::boolean, false) = false
        GROUP BY t->>'entity'
        ORDER BY channels DESC, avg_main_thread_ms DESC
        LIMIT 30
        `,
        params
      ),
      dataSource.query(
        `
        ${latest}
        SELECT count(*)::int AS channels,
          count(*) FILTER (WHERE (lcp->>'is_image')::boolean)::int AS lcp_image,
          count(*) FILTER (WHERE (lcp->>'lazy_loaded')::boolean)::int AS lcp_lazy_loaded,
          count(*) FILTER (WHERE (lcp->>'is_image')::boolean AND (lcp->>'priority_hinted')::boolean = false)::int AS lcp_missing_priority_hint,
          count(*) FILTER (WHERE (lcp->>'discoverable')::boolean = false)::int AS lcp_not_discoverable,
          round(avg((lcp->>'ttfb_ms')::numeric))::int AS avg_ttfb_ms,
          round(avg((lcp->>'load_delay_ms')::numeric))::int AS avg_load_delay_ms,
          round(avg((lcp->>'load_duration_ms')::numeric))::int AS avg_load_duration_ms,
          round(avg((lcp->>'render_delay_ms')::numeric))::int AS avg_render_delay_ms,
          round(avg(total_bytes))::int AS avg_total_bytes,
          round(avg(request_count))::int AS avg_requests,
          round(avg(${THIRD_PARTY_MS}))::int AS avg_third_party_ms,
          ${TYPES.map((type) => `round(avg(COALESCE((bytes_by_type->>'${type}')::numeric, 0)))::int AS "bytes_${type}"`).join(',\n          ')}
        FROM latest
        `,
        params
      ),
    ]);

    const summary = summaryRows[0] ?? {};
    const avgBytesByType: Record<string, number> = {};
    for (const type of TYPES) if (summary[`bytes_${type}`]) avgBytesByType[type] = summary[`bytes_${type}`];

    return {
      channels_with_data: summary.channels ?? 0,
      resources: resources.map((row: Record<string, unknown>): GroupResource => ({
        key: row.key as string,
        entity: (row.entity as string | null) ?? undefined,
        own: row.own as boolean,
        audits: [...new Set((row.audits as string[][]).flat())],
        channels: row.channels as number,
        avg_wasted_ms: orUndefined(row.avg_wasted_ms as number | null),
        avg_wasted_bytes: orUndefined(row.avg_wasted_bytes as number | null),
        avg_total_bytes: orUndefined(row.avg_total_bytes as number | null),
        top_channels: (row.top_channels as GroupResource['top_channels']).slice(0, 5),
      })),
      third_parties: thirdParties.map((row: Record<string, unknown>) => ({
        entity: row.entity as string,
        category: (row.category as string | null) ?? undefined,
        channels: row.channels as number,
        avg_main_thread_ms: (row.avg_main_thread_ms as number | null) ?? 0,
        avg_bytes: (row.avg_bytes as number | null) ?? 0,
      })),
      lcp: {
        image: summary.lcp_image ?? 0,
        lazy_loaded: summary.lcp_lazy_loaded ?? 0,
        missing_priority_hint: summary.lcp_missing_priority_hint ?? 0,
        not_discoverable: summary.lcp_not_discoverable ?? 0,
        avg_ttfb_ms: orUndefined(summary.avg_ttfb_ms ?? null),
        avg_load_delay_ms: orUndefined(summary.avg_load_delay_ms ?? null),
        avg_load_duration_ms: orUndefined(summary.avg_load_duration_ms ?? null),
        avg_render_delay_ms: orUndefined(summary.avg_render_delay_ms ?? null),
      },
      weight: {
        avg_total_bytes: orUndefined(summary.avg_total_bytes ?? null),
        avg_requests: orUndefined(summary.avg_requests ?? null),
        avg_bytes_by_type: avgBytesByType,
        avg_third_party_ms: orUndefined(summary.avg_third_party_ms ?? null),
      },
    };
  }
}
