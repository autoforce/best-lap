import { z } from 'zod'

// z.coerce.boolean() turns any non-empty string into true, so "false" would enable a flag
const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .optional()
    .transform((value) => (value === undefined ? defaultValue : ['true', '1', 'yes'].includes(value)))

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  LOG_LEVEL: z.string().default('info'),

  ADMIN_PORT: z.coerce.number().default(4000),
  // Password for the Bull Board panel (HTTP Basic, user "admin")
  ADMIN_TOKEN: z.string().optional(),

  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_LOGGING: booleanFlag(false),
  // Connections each process may open. The production Postgres allows 25 in total,
  // and the API and the collector each have their own pool.
  DB_POOL_MAX: z.coerce.number().int().min(1).default(5),

  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PASSWORD: z.string().optional(),

  GOOGLE_API_KEY: z.string().optional(),

  COLLECT_METRICS_CRON_EXPRESSION: z.string().default('0 8,14,20 * * *'),
  // Timezone used by every cron expression (collection, sync, alerts)
  CRON_TIMEZONE: z.string().default('America/Sao_Paulo'),
  WORKER_CONCURRENCY: z.coerce.number().default(10),
  PSI_TIMEOUT_MS: z.coerce.number().default(90_000),

  // Autoforce API Integration
  AUTOFORCE_API_URL: z.string().url().optional(),
  AUTOFORCE_API_KEY: z.string().optional(),
  SYNC_CHANNELS_CRON: z.string().default('0 2 * * *'), // 2AM daily
  SYNC_CHANNELS_ENABLED: booleanFlag(true),
  SYNC_API_KEY: z.string().min(32, 'SYNC_API_KEY must be at least 32 characters').optional(),

  // Alerts (Slack incoming webhook)
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  ALERTS_CRON: z.string().default('0 9 * * *'),
  WEEKLY_DIGEST_CRON: z.string().default('0 9 * * 1'),
  DASHBOARD_URL: z.string().url().optional(),

  CORS_ORIGIN: z.string().default('*'),

  FORCE_HTTP_SWAGGER: booleanFlag(false),

  // Required by the API only; validated when the API starts (see requireApiEnv)
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
})

function validateEnv() {
  const rawEnv = {
    API_PORT: process.env.API_PORT || process.env.SERVER_PORT || process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,

    ADMIN_PORT: process.env.ADMIN_PORT || process.env.BULL_BOARD_PORT,
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,

    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    DB_LOGGING: process.env.DB_LOGGING?.toLowerCase(),
    DB_POOL_MAX: process.env.DB_POOL_MAX,

    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,

    COLLECT_METRICS_CRON_EXPRESSION: process.env.COLLECT_METRICS_CRON_EXPRESSION,
    CRON_TIMEZONE: process.env.CRON_TIMEZONE,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
    PSI_TIMEOUT_MS: process.env.PSI_TIMEOUT_MS,

    AUTOFORCE_API_URL: process.env.AUTOFORCE_API_URL,
    AUTOFORCE_API_KEY: process.env.AUTOFORCE_API_KEY,
    SYNC_CHANNELS_CRON: process.env.SYNC_CHANNELS_CRON,
    SYNC_CHANNELS_ENABLED: process.env.SYNC_CHANNELS_ENABLED?.toLowerCase(),
    SYNC_API_KEY: process.env.SYNC_API_KEY,

    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    ALERTS_CRON: process.env.ALERTS_CRON,
    WEEKLY_DIGEST_CRON: process.env.WEEKLY_DIGEST_CRON,
    DASHBOARD_URL: process.env.DASHBOARD_URL,

    CORS_ORIGIN: process.env.CORS_ORIGIN,

    FORCE_HTTP_SWAGGER: process.env.FORCE_HTTP_SWAGGER?.toLowerCase(),

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  }

  // Convert empty strings to undefined to match t3-env behavior
  const cleanedEnv = Object.fromEntries(
    Object.entries(rawEnv).map(([key, value]) => [
      key,
      value === '' ? undefined : value
    ])
  )

  try {
    return envSchema.parse(cleanedEnv)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.issues)
    } else {
      console.error('❌ Invalid environment variables:', error)
    }
    throw new Error('Invalid environment variables')
  }
}

export const env = validateEnv()

/** Variables the API cannot run without. Call once at API startup. */
export function requireApiEnv(): { JWT_SECRET: string } {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required by the API (at least 32 characters)')
  }
  return { JWT_SECRET: env.JWT_SECRET }
}
