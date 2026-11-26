export const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

export function isValidTimeZone(value?: string | null): value is string {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function resolveTimeZone(value?: string | null): string {
  return isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE
}

function timeZoneParts(now: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
  return Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

/** 用户时区下的 YYYY-MM-DD */
export function dateKeyInTimeZone(now: Date, timeZone: string): string {
  const parts = timeZoneParts(now, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** 用户时区下的小时（0-23） */
export function hourInTimeZone(now: Date, timeZone: string): number {
  return Number(timeZoneParts(now, timeZone).hour)
}

/** DailyLearning 的 Date 字段固定存某个自然日对应的 UTC 零点 */
export function parseDateKey(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error('日期格式无效，应为 YYYY-MM-DD')
  }
  const value = new Date(`${dateKey}T00:00:00.000Z`)
  if (
    Number.isNaN(value.getTime()) ||
    value.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new Error('日期格式无效，应为 YYYY-MM-DD')
  }
  return value
}
