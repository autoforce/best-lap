import Redis from "ioredis";
import { env } from '@best-lap/env';

export const connection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
});

// Without a listener ioredis only prints "Unhandled error event". Log the reason once per
// outage instead of on every reconnection attempt, and say when it is back.
let lastError: string | undefined;
connection.on('error', (error) => {
  if (error.message === lastError) return;
  lastError = error.message;
  console.error('Redis connection error:', error.message);
});
connection.on('ready', () => {
  if (lastError) console.log('Redis connection restored');
  lastError = undefined;
});
