function parseField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>()

  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/')
    const step = stepRaw ? Number(stepRaw) : 1
    let start = min
    let end = max

    if (range !== '*') {
      const [a, b] = range.split('-').map(Number)
      start = a
      end = b ?? (stepRaw ? max : a)
    }

    if ([start, end, step].some(Number.isNaN) || step < 1) return null

    for (let v = start; v <= end; v += step) values.add(v)
  }

  return [...values].sort((a, b) => a - b)
}

function wallClock(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>
  return parts
}

/** Milliseconds to add to a UTC instant to get the wall clock of `timeZone` */
function offsetMs(date: Date, timeZone: string) {
  const p = wallClock(date, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(date.getTime() / 60000) * 60000
}

/**
 * Next run of a daily cron expression ("m h * * *") evaluated in `timeZone`, the same zone the
 * collector schedules with. Returns null for expressions that depend on day of month, month or weekday.
 */
export function nextCronRun(expression: string, from = new Date(), timeZone = 'UTC'): Date | null {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return null

  const [minuteField, hourField, dom, month, dow] = fields
  if (dom !== '*' || month !== '*' || dow !== '*') return null

  const minutes = parseField(minuteField, 0, 59)
  const hours = parseField(hourField, 0, 23)
  if (!minutes || !hours) return null

  const today = wallClock(from, timeZone)

  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    for (const hour of hours) {
      for (const minute of minutes) {
        // Wall time written as if it were UTC, then shifted by the zone offset (twice, for DST edges)
        const wall = Date.UTC(today.year, today.month - 1, today.day + dayOffset, hour, minute)
        const firstGuess = wall - offsetMs(new Date(wall), timeZone)
        const candidate = new Date(wall - offsetMs(new Date(firstGuess), timeZone))
        if (candidate > from) return candidate
      }
    }
  }

  return null
}
