import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../prisma/migrations/202608260001_custodian_history/migration.sql', import.meta.url), 'utf8')
const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8')
const lifecycle = readFileSync(new URL('../src/modules/lifecycle/lifecycle.service.ts', import.meta.url), 'utf8')
const assets = readFileSync(new URL('../src/modules/assets/assets.service.ts', import.meta.url), 'utf8')

// ── schema ───────────────────────────────────────────────────────────────────

test('history carries a custodian reference that does not depend on a login', () => {
  const model = schema.slice(schema.indexOf('model AssetHistory'), schema.indexOf('model Attachment'))
  assert.match(model, /fromCustodianId\s+String\?/)
  assert.match(model, /toCustodianId\s+String\?/)
  assert.match(model, /fromCustodian\s+Person\?/)
  assert.match(model, /toCustodian\s+Person\?/)
})

test('the legacy user columns are kept for backward compatibility', () => {
  const model = schema.slice(schema.indexOf('model AssetHistory'), schema.indexOf('model Attachment'))
  assert.match(model, /fromUserId\s+String\?/)
  assert.match(model, /toUserId\s+String\?/)
})

test('the custodian columns are indexed', () => {
  const model = schema.slice(schema.indexOf('model AssetHistory'), schema.indexOf('model Attachment'))
  assert.match(model, /@@index\(\[fromCustodianId\]\)/)
  assert.match(model, /@@index\(\[toCustodianId\]\)/)
})

// ── migration safety ─────────────────────────────────────────────────────────

test('the migration is additive: it adds nullable columns and drops nothing', () => {
  assert.match(migration, /ADD COLUMN "fromCustodianId" UUID;/)
  assert.match(migration, /ADD COLUMN "toCustodianId" UUID;/)
  assert.equal(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i.test(migration), false, 'migration must not drop anything')
  assert.equal(/\bTRUNCATE\b/i.test(migration), false, 'migration must not truncate')
  assert.equal(/\bDELETE\s+FROM\b/i.test(migration), false, 'migration must not delete rows')
  assert.equal(/NOT NULL/i.test(migration), false, 'new columns must stay nullable')
})

test('the migration creates foreign keys and indexes for the new columns', () => {
  assert.match(migration, /asset_history_fromCustodianId_fkey[\s\S]*REFERENCES "people"\("id"\)/)
  assert.match(migration, /asset_history_toCustodianId_fkey[\s\S]*REFERENCES "people"\("id"\)/)
  assert.match(migration, /CREATE INDEX "asset_history_fromCustodianId_idx"/)
  assert.match(migration, /CREATE INDEX "asset_history_toCustodianId_idx"/)
})

test('the append-only trigger is restored after the one-off backfill', () => {
  const disableAt = migration.indexOf('DISABLE TRIGGER')
  const enableAt = migration.indexOf('ENABLE TRIGGER')
  assert.ok(disableAt > -1 && enableAt > disableAt, 'the trigger must be suspended and then restored')
  assert.equal(migration.slice(enableAt).includes('UPDATE "asset_history"'), false, 'no write may follow the trigger being restored')
})

// ── backfill determinism ─────────────────────────────────────────────────────

test('backfill joins the transaction each row already points at', () => {
  assert.match(migration, /FROM "asset_assignments" AS a[\s\S]*h\."referenceType" = 'AssetAssignment'/)
  assert.match(migration, /FROM "asset_returns" AS r[\s\S]*h\."referenceType" = 'AssetReturn'/)
  assert.match(migration, /FROM "asset_transfers" AS t[\s\S]*h\."referenceType" = 'AssetTransfer'/)
})

test('backfill never guesses from the Vietnamese description text', () => {
  assert.equal(/description\s*(=|LIKE|ILIKE|~)/i.test(migration), false, 'the description must not drive the backfill')
})

test('backfill only writes rows that are still empty, so it can be re-run safely', () => {
  const updates = migration.split('UPDATE "asset_history"').slice(1)
  assert.equal(updates.length, 3)
  for (const statement of updates) assert.match(statement, /CustodianId" IS NULL/)
})

// ── lifecycle writes ─────────────────────────────────────────────────────────

test('handover records the person who received the asset', () => {
  const assign = lifecycle.slice(lifecycle.indexOf('AssetHistoryAction.ASSIGNED'))
  assert.match(assign.slice(0, 400), /toCustodianId:person\.id/)
})

test('return records the person who gave the asset back', () => {
  const ret = lifecycle.slice(lifecycle.indexOf('AssetHistoryAction.RETURNED'))
  assert.match(ret.slice(0, 400), /fromCustodianId:assignment\.assignedToId/)
})

test('transfer states that custody did not change rather than implying a handover', () => {
  const transfer = lifecycle.slice(lifecycle.indexOf('AssetHistoryAction.TRANSFERRED'))
  const head = transfer.slice(0, 400)
  assert.match(head, /fromCustodianId:asset\.currentCustodianId/)
  assert.match(head, /toCustodianId:asset\.currentCustodianId/)
})

test('the legacy user columns are still written when the person has an account', () => {
  assert.match(lifecycle, /toUserId:person\.linkedUserId/)
  assert.match(lifecycle, /fromUserId:assignment\.assignedTo\.linkedUserId/)
})

// ── history read ─────────────────────────────────────────────────────────────

test('asset history returns the custodians, not only the acting account', () => {
  const history = assets.slice(assets.indexOf('async history('))
  const head = history.slice(0, 700)
  assert.match(head, /fromCustodian:\{select:\{id:true,employeeCode:true,fullName:true/)
  assert.match(head, /toCustodian:\{select:\{id:true,employeeCode:true,fullName:true/)
  assert.match(head, /actor:\{select:\{id:true,username:true,fullName:true\}\}/)
})
