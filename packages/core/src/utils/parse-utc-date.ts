/**
 * Parses a YYYY-MM-DD date as a UTC calendar day, independent of the server timezone.
 * TimescaleDB buckets are aligned to UTC days, so date filters must be too.
 */
export const startOfUtcDay = (date: string): Date => new Date(`${date.slice(0, 10)}T00:00:00.000Z`)

export const endOfUtcDay = (date: string): Date => new Date(`${date.slice(0, 10)}T23:59:59.999Z`)
