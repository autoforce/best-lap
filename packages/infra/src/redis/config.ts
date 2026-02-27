import { env } from "@best-lap/env";
import { RedisOptions } from "ioredis";

export const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
}
