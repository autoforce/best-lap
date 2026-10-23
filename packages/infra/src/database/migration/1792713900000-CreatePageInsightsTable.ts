import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Latest Lighthouse findings per page: opportunities (with estimated savings), failing
 * diagnostics and the real-user field data PageSpeed Insights returns. One row per page,
 * replaced on every collection.
 */
export class CreatePageInsightsTable1792713900000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "page_insights" (
                "page_id" uuid PRIMARY KEY REFERENCES "pages" ("id") ON DELETE CASCADE,
                "collected_at" timestamptz NOT NULL DEFAULT now(),
                "lighthouse_version" text,
                "opportunities" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "diagnostics" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "field_data" jsonb
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "page_insights"`);
    }
}
