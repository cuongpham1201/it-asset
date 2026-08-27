/**
 * AssetFlow business timezone = Asia/Ho_Chi_Minh (UTC+07:00).
 *
 * Vietnam does not observe daylight saving, so the offset is a constant and a bare calendar
 * date can be turned into an instant with plain arithmetic — no timezone library needed.
 * Multi-timezone support is deliberately out of scope; if it ever arrives, this is the one
 * place that has to change.
 */
export const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const BUSINESS_UTC_OFFSET_MINUTES = 7 * 60

const BARE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

/** True for `YYYY-MM-DD` with nothing else — a calendar day, not an instant. */
export const isBareDate = (value: string) => BARE_DATE.test(value.trim())

/** Midnight at the start of the given business day, as a UTC instant. */
export function startOfBusinessDate(value: string): Date {
  const match = BARE_DATE.exec(value.trim())
  if (!match) throw new RangeError(`Not a bare date: ${value}`)
  const [, year, month, day] = match
  const utcMidnight = Date.UTC(Number(year), Number(month) - 1, Number(day))
  return new Date(utcMidnight - BUSINESS_UTC_OFFSET_MINUTES * 60_000)
}

/** Midnight at the start of the day after the given business day — the exclusive upper bound. */
export const startOfNextBusinessDate = (value: string) => new Date(startOfBusinessDate(value).getTime() + DAY_MS)

export interface CreatedAtRange { gte?: Date; lt?: Date; lte?: Date }

/**
 * Builds the half-open range `[from, to)` a date filter means.
 *
 * A bare date is read as a whole business day in Vietnam; a full ISO timestamp is an exact
 * instant and is used as given (inclusive on both ends, since the caller named that moment).
 */
export function businessDateRange(from?: string, to?: string): CreatedAtRange | undefined {
  if (!from && !to) return undefined
  const range: CreatedAtRange = {}
  if (from) range.gte = isBareDate(from) ? startOfBusinessDate(from) : new Date(from)
  if (to) {
    if (isBareDate(to)) range.lt = startOfNextBusinessDate(to)
    else range.lte = new Date(to)
  }
  return range
}
