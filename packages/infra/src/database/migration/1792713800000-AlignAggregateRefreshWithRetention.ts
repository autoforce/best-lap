import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Raw metrics are kept for 14 days, but the continuous aggregate policies refreshed windows of
 * 90 days (daily) and 1 year (weekly). Refreshing a window whose raw data was already dropped
 * recomputes those buckets from nothing and erases the aggregated history.
 * The refresh windows now stay inside the raw retention, so old aggregates are never touched.
 */
export class AlignAggregateRefreshWithRetention1792713800000 implements MigrationInterface {
    public readonly transaction = false;

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`SELECT remove_continuous_aggregate_policy('metrics_daily', if_exists => true)`);
        await queryRunner.query(`
            SELECT add_continuous_aggregate_policy('metrics_daily',
                start_offset => INTERVAL '13 days',
                end_offset => INTERVAL '0 days',
                schedule_interval => INTERVAL '1 hour')
        `);

        // A weekly policy window must span at least two buckets, i.e. 14 days
        await queryRunner.query(`SELECT remove_continuous_aggregate_policy('metrics_weekly', if_exists => true)`);
        await queryRunner.query(`
            SELECT add_continuous_aggregate_policy('metrics_weekly',
                start_offset => INTERVAL '14 days',
                end_offset => INTERVAL '0 days',
                schedule_interval => INTERVAL '1 hour')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`SELECT remove_continuous_aggregate_policy('metrics_daily', if_exists => true)`);
        await queryRunner.query(`
            SELECT add_continuous_aggregate_policy('metrics_daily',
                start_offset => INTERVAL '90 days',
                end_offset => INTERVAL '0 days',
                schedule_interval => INTERVAL '1 hour')
        `);
        await queryRunner.query(`SELECT remove_continuous_aggregate_policy('metrics_weekly', if_exists => true)`);
        await queryRunner.query(`
            SELECT add_continuous_aggregate_policy('metrics_weekly',
                start_offset => INTERVAL '1 year',
                end_offset => INTERVAL '0 days',
                schedule_interval => INTERVAL '1 hour')
        `);
    }
}
