import { dataSource } from './data-source';

interface ConnectOptions {
  /**
   * Only one process should apply migrations (the API, or `pnpm db:migrate`).
   * Workers connect without migrating, so two services never race on a deploy.
   */
  runMigrations?: boolean
}

export const connectToDatabase = async ({ runMigrations = false }: ConnectOptions = {}) => {
  if (!dataSource.isInitialized) {
    try {
      await dataSource.initialize()
      if (runMigrations) {
        await dataSource.runMigrations();
      }
    } catch (err) {
      console.error('Error during Database initialization. Error: ', err)
      throw err;
    }
  }

  return dataSource
}
