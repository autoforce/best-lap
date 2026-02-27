import { z } from 'zod'

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'test', 'production']),

  ADMIN_PORT: z.coerce.number().default(4000),

  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),

  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PASSWORD: z.string().optional(),

  GOOGLE_API_KEY: z.string().optional(),

  COLLECT_METRICS_CRON_EXPRESSION: z.coerce.string().default('0 8,14,20 * * *'),
  SEED_THEMES_URL: z.string().default('https://lucsmac.github.io/autodromo-domains/full_data.json'),
  WORKER_CONCURRENCY: z.coerce.number().default(10),

  CORS_ORIGIN: z.string().default('*'),

  FORCE_HTTP_SWAGGER: z.coerce.boolean().default(false),

  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
})

function validateEnv() {
  const rawEnv = {
    API_PORT: process.env.SERVER_PORT,
    NODE_ENV: process.env.NODE_ENV,

    ADMIN_PORT: process.env.ADMIN_PORT || process.env.BULL_BOARD_PORT,

    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,

    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,

    COLLECT_METRICS_CRON_EXPRESSION: process.env.COLLECT_METRICS_CRON_EXPRESSION,
    SEED_THEMES_URL: process.env.SEED_THEMES_URL,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,

    CORS_ORIGIN: process.env.CORS_ORIGIN,

    FORCE_HTTP_SWAGGER: process.env.FORCE_HTTP_SWAGGER,

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