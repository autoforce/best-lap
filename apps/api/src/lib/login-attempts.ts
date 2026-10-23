/**
 * In-memory brute force protection for the login route.
 * Counts failures per IP and per e-mail; enough for a single API instance.
 */
const WINDOW_MS = 15 * 60 * 1000
// Per e-mail it stops password guessing; per IP it is looser, since an office shares one IP
const MAX_FAILURES = { email: 10, ip: 50 }

const failures = new Map<string, { count: number; resetAt: number }>()

function keysFor(ip: string, email: string) {
  return [`ip:${ip}`, `email:${email.toLowerCase()}`]
}

/** Seconds until the caller may try again, or 0 when allowed */
export function retryAfterSeconds(ip: string, email: string, now = Date.now()): number {
  let wait = 0
  for (const key of keysFor(ip, email)) {
    const entry = failures.get(key)
    if (!entry) continue
    if (entry.resetAt <= now) {
      failures.delete(key)
      continue
    }
    const limit = key.startsWith('ip:') ? MAX_FAILURES.ip : MAX_FAILURES.email
    if (entry.count >= limit) wait = Math.max(wait, Math.ceil((entry.resetAt - now) / 1000))
  }
  return wait
}

export function registerFailure(ip: string, email: string, now = Date.now()) {
  for (const key of keysFor(ip, email)) {
    const entry = failures.get(key)
    if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
    else entry.count += 1
  }
}

export function clearFailures(ip: string, email: string) {
  for (const key of keysFor(ip, email)) failures.delete(key)
}
