import Redis from "ioredis";
import { env } from '@best-lap/env';

export const connection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
});