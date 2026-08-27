import assert from 'node:assert/strict'
import test from 'node:test'
import { AuditService } from '../src/modules/audit/audit.service'
import { BUSINESS_TIMEZONE, businessDateRange, isBareDate, startOfBusinessDate, startOfNextBusinessDate } from '../src/modules/audit/audit.time'

// These tests must hold no matter which timezone the test process runs in. Every expectation
// is an explicit UTC instant; nothing here reads the host clock or process.env.TZ.

const admin = { id: 'admin-1', role: 'ADMIN' }

/** Applies the range the service builds to a set of instants, the way Postgres would. */
async function filterInstants(query: { from?: string; to?: string }, instants: string[]) {
  let captured: any
  const db = {
    $transaction: (operations: any[]) => Promise.all(operations),
    auditLog: { findMany: (args: any) => { captured = args; return Promise.resolve([]) }, count: () => Promise.resolve(0) },
    user: { findMany: () => Promise.resolve([]) },
  }
  await new AuditService(db as any).list({ page: 1, limit: 25, ...query } as any, admin as any)
  const range = captured.where.createdAt as { gte?: Date; lt?: Date; lte?: Date }
  return instants.filter(iso => {
    const t = new Date(iso).getTime()
    if (range.gte && t < range.gte.getTime()) return false
    if (range.lt && t >= range.lt.getTime()) return false
    if (range.lte && t > range.lte.getTime()) return false
    return true
  })
}

test('the business timezone is stated explicitly and is Vietnam', () => {
  assert.equal(BUSINESS_TIMEZONE, 'Asia/Ho_Chi_Minh')
})

test('a bare date is recognised; anything with a time component is not', () => {
  assert.equal(isBareDate('2026-08-26'), true)
  assert.equal(isBareDate(' 2026-08-26 '), true)
  assert.equal(isBareDate('2026-08-26T08:15:00+07:00'), false)
  assert.equal(isBareDate('2026-08-26T00:00:00Z'), false)
  assert.equal(isBareDate('26/08/2026'), false)
})

test('a Vietnamese business day starts at 17:00Z the evening before', () => {
  assert.equal(startOfBusinessDate('2026-08-26').toISOString(), '2026-08-25T17:00:00.000Z')
  assert.equal(startOfNextBusinessDate('2026-08-26').toISOString(), '2026-08-26T17:00:00.000Z')
})

test('from=to=one day becomes the half-open UTC range the day maps onto', () => {
  const range = businessDateRange('2026-08-26', '2026-08-26')!
  assert.equal(range.gte!.toISOString(), '2026-08-25T17:00:00.000Z')
  assert.equal(range.lt!.toISOString(), '2026-08-26T17:00:00.000Z')
  assert.equal(range.lte, undefined, 'a bare end date must be exclusive, never 23:59:59.999')
})

// ── boundary cases A–D, one day selected ─────────────────────────────────────

const DAY = { from: '2026-08-26', to: '2026-08-26' }

test('A: 00:30 local on the selected day is included', async () => {
  assert.deepEqual(await filterInstants(DAY, ['2026-08-25T17:30:00Z']), ['2026-08-25T17:30:00Z'])
})

test('B: 23:30 local on the selected day is included', async () => {
  assert.deepEqual(await filterInstants(DAY, ['2026-08-26T16:30:00Z']), ['2026-08-26T16:30:00Z'])
})

test('C: 23:59:59.999 local on the previous day is excluded', async () => {
  assert.deepEqual(await filterInstants(DAY, ['2026-08-25T16:59:59.999Z']), [])
})

test('D: 00:00 local on the next day is excluded', async () => {
  assert.deepEqual(await filterInstants(DAY, ['2026-08-26T17:00:00.000Z']), [])
})

test('the four boundaries together select exactly the business day', async () => {
  const kept = await filterInstants(DAY, [
    '2026-08-25T16:59:59.999Z', // 23:59:59.999 +07 previous day  → out
    '2026-08-25T17:00:00.000Z', // 00:00:00 +07 selected day       → in
    '2026-08-25T17:30:00Z',     // 00:30 +07                        → in
    '2026-08-26T16:30:00Z',     // 23:30 +07                        → in
    '2026-08-26T16:59:59.999Z', // 23:59:59.999 +07 selected day    → in
    '2026-08-26T17:00:00.000Z', // 00:00 +07 next day               → out
  ])
  assert.deepEqual(kept, ['2026-08-25T17:00:00.000Z', '2026-08-25T17:30:00Z', '2026-08-26T16:30:00Z', '2026-08-26T16:59:59.999Z'])
})

// ── E / F: one-sided filters ─────────────────────────────────────────────────

test('E: from only is inclusive from the local start of that day', async () => {
  const kept = await filterInstants({ from: '2026-08-26' }, ['2026-08-25T16:59:59.999Z', '2026-08-25T17:00:00.000Z', '2030-01-01T00:00:00Z'])
  assert.deepEqual(kept, ['2026-08-25T17:00:00.000Z', '2030-01-01T00:00:00Z'])
})

test('F: to only is exclusive from the local start of the following day', async () => {
  const kept = await filterInstants({ to: '2026-08-26' }, ['2000-01-01T00:00:00Z', '2026-08-26T16:59:59.999Z', '2026-08-26T17:00:00.000Z'])
  assert.deepEqual(kept, ['2000-01-01T00:00:00Z', '2026-08-26T16:59:59.999Z'])
})

// ── G: explicit timestamps are kept exactly ──────────────────────────────────

test('G: a full ISO datetime with an offset is used as that exact instant', () => {
  const range = businessDateRange('2026-08-26T08:15:00+07:00', '2026-08-26T09:00:00+07:00')!
  assert.equal(range.gte!.toISOString(), '2026-08-26T01:15:00.000Z')
  assert.equal(range.lte!.toISOString(), '2026-08-26T02:00:00.000Z')
  assert.equal(range.lt, undefined, 'an explicit end instant is not widened to a day')
})

test('G: a UTC timestamp is not re-read as a Vietnamese midnight', () => {
  const range = businessDateRange('2026-08-26T00:00:00Z')!
  assert.equal(range.gte!.toISOString(), '2026-08-26T00:00:00.000Z')
})

test('no dates means no createdAt constraint at all', () => {
  assert.equal(businessDateRange(undefined, undefined), undefined)
})
