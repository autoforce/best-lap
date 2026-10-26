import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Daily snapshot of each page (weight by type, third parties, flagged files, LCP element),
 * a few KB per page. Compressed after 7 days and kept for 60, so the dashboard can show what
 * changed and what repeats across a theme without storing full Lighthouse reports.
 */
export class CreatePageSnapshotsTable1792714000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "page_snapshots" (
                "page_id" uuid NOT NULL REFERENCES "pages" ("id") ON DELETE CASCADE,
                "day" date NOT NULL,
                "collected_at" timestamptz NOT NULL,
                "total_bytes" integer,
                "request_count" integer,
                "bytes_by_type" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "third_parties" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "resources" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "lcp" jsonb,
                "checks" jsonb NOT NULL DEFAULT '{}'::jsonb,
                PRIMARY KEY ("page_id", "day")
            )
        `);

        await queryRunner.query(`
            SELECT create_hypertable('page_snapshots', 'day', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE)
        `);
        await queryRunner.query(`
            ALTER TABLE page_snapshots SET (
                timescaledb.compress,
                timescaledb.compress_segmentby = 'page_id',
                timescaledb.compress_orderby = 'day DESC'
            )
        `);
        await queryRunner.query(`SELECT add_compression_policy('page_snapshots', INTERVAL '7 days', if_not_exists => TRUE)`);
        await queryRunner.query(`SELECT add_retention_policy('page_snapshots', INTERVAL '60 days', if_not_exists => TRUE)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "page_snapshots"`);
    }
}
