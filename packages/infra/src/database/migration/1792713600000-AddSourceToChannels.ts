import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class AddSourceToChannels1792713600000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'channels',
            new TableColumn({
                name: 'source',
                type: 'text',
                isNullable: true,
            })
        );

        await queryRunner.createIndex(
            'channels',
            new TableIndex({
                name: 'IDX_channels_source',
                columnNames: ['source'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('channels', 'IDX_channels_source');
        await queryRunner.dropColumn('channels', 'source');
    }
}
