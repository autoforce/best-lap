import { DataSource } from 'typeorm';
import { env } from '@best-lap/env';

// Import entities directly to ensure they're always available
import { Channel } from '../typeorm/entities/channel-entity';
import { Page } from '../typeorm/entities/page-entity';
import { Metric } from '../typeorm/entities/metric-entity';
import { Provider } from '../typeorm/entities/provider-entity';
import { User } from '../typeorm/entities/user-entity';

// Import migrations directly to avoid dynamic loading issues with Node.js v22
import { CreateChannelTable1732044214596 } from './migration/1732044214596-CreateChannelTable';
import { CreatePageTable1732044214599 } from './migration/1732044214599-CreatePageTable';
import { CreateMetricsTable1732044260612 } from './migration/1732044260612-CreateMetricsTable';
import { SetupHypertable1732050948683 } from './migration/1732050948683-SetupHypertable';
import { CreateMetricsPrimaryKeys1732278565823 } from './migration/1732278565823-CreateMetricsPrimaryKeys';
import { AddContinuousAggregatesAndPolicies1732278565824 } from './migration/1732278565824-AddContinuousAggregatesAndPolicies';
import { CreateProviderTable1737562800000 } from './migration/1737562800000-CreateProviderTable';
import { AddProviderIdToPages1737562800001 } from './migration/1737562800001-AddProviderIdToPages';
import { AddProviderIdToChannels1737562800002 } from './migration/1737562800002-AddProviderIdToChannels';
import { CreateUsersTable1740000000000 } from './migration/1740000000000-CreateUsersTable';

export const dataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: 5432,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: false,
  logging: true,
  migrationsTransactionMode: 'each',
  // Use direct imports for more reliable entity loading
  entities: [Channel, Page, Metric, Provider, User],
  // Use direct imports for migrations to avoid dynamic loading issues
  migrations: [
    CreateChannelTable1732044214596,
    CreatePageTable1732044214599,
    CreateMetricsTable1732044260612,
    SetupHypertable1732050948683,
    CreateMetricsPrimaryKeys1732278565823,
    AddContinuousAggregatesAndPolicies1732278565824,
    CreateProviderTable1737562800000,
    AddProviderIdToPages1737562800001,
    AddProviderIdToChannels1737562800002,
    CreateUsersTable1740000000000,
  ]
});
