import Redis from "ioredis";
import { redisOptions } from "./config";

let client: Redis | null = null

function getClient() {
  client ??= new Redis({ ...redisOptions, lazyConnect: false, maxRetriesPerRequest: 2 })
  return client
}

/**
 * Takes a lock that expires on its own. Used so a scheduled task runs once even when
 * more than one collector instance is up. Returns false when someone else holds it.
 */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await getClient().set(`best-lap:lock:${key}`, String(process.pid), 'EX', ttlSeconds, 'NX')
  return result === 'OK'
}

/** Remembers that something happened (e.g. an alert was sent) for `ttlSeconds`. True the first time only. */
export async function markOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const result = await getClient().set(`best-lap:once:${key}`, '1', 'EX', ttlSeconds, 'NX')
  return result === 'OK'
}

export async function closeLockClient() {
  if (client) {
    await client.quit().catch(() => undefined)
    client = null
  }
}
