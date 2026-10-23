import 'reflect-metadata'
import { connectToDatabase } from './database/start-connection';

// `pnpm db:migrate`: applies pending migrations and exits
connectToDatabase({ runMigrations: true }).then(async (dataSource) => {
  console.log('Migrations applied successfully.');
  await dataSource.destroy();
  process.exit(0);
}).catch((error) => {
  console.error('Error running migrations:', error);
  process.exit(1);
});
