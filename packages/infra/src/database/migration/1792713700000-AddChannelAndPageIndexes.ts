import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChannelAndPageIndexes1792713700000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_channels_active" ON "channels" ("active")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_channels_theme" ON "channels" ("theme")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_channels_provider_id" ON "channels" ("provider_id")`);

        // A page path must be unique inside its channel. Existing duplicates would make the
        // unique index fail and block the deploy, so in that case a plain index is created
        // and the duplicates are reported for manual cleanup.
        const duplicates: Array<{ channel_id: string; path: string; total: string }> = await queryRunner.query(`
            SELECT channel_id, path, COUNT(*) AS total
            FROM pages
            GROUP BY channel_id, path
            HAVING COUNT(*) > 1
        `);

        if (duplicates.length === 0) {
            await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pages_channel_path" ON "pages" ("channel_id", "path")`);
        } else {
            console.warn(
                `⚠️  ${duplicates.length} duplicated (channel_id, path) pairs found in "pages". ` +
                'Created a non-unique index instead. Merge the duplicates and create UQ_pages_channel_path manually:',
                duplicates.slice(0, 20)
            );
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pages_channel_path" ON "pages" ("channel_id", "path")`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_pages_channel_path"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pages_channel_path"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_provider_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_theme"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channels_active"`);
    }
}
