import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { INVENTORY_RESULT_LABEL, INVENTORY_RESULT_TONE } from '../src/api/inventory'

const screen = readFileSync(new URL('../src/features/inventory/InventoryManagement.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/api/inventory.ts', import.meta.url), 'utf8')

test('every verdict the server can return has a label and a colour', () => {
  for (const result of ['PENDING', 'MATCHED', 'MISSING', 'UNEXPECTED', 'LOCATION_MISMATCH', 'CUSTODIAN_MISMATCH'] as const) {
    assert.ok(INVENTORY_RESULT_LABEL[result], `${result} has no label`)
    assert.ok(INVENTORY_RESULT_TONE[result], `${result} has no tone`)
  }
})

test('the stocktake client calls the real inventory endpoints', () => {
  assert.match(client, /api\.post<InventorySession>\('\/inventories'/)
  assert.match(client, /\/inventories\/\$\{id\}\/scan/)
  assert.match(client, /\/inventories\/\$\{id\}\/close/)
  assert.match(client, /\/inventories\/\$\{id\}\/cancel/)
  assert.match(client, /api\.get<InventorySession>\(`\/inventories\/\$\{id\}`/)
})

test('the stocktake screen persists through the API rather than local state', () => {
  for (const call of ['createInventory', 'scanInventory', 'closeInventory', 'cancelInventory', 'getInventory', 'listInventories']) {
    assert.ok(screen.includes(call), `${call} is not used by the screen`)
  }
  assert.equal(/useState<Record<[^>]*>>\(\{\}\)/.test(screen), false, 'counting results are held in local state again')
  assert.equal(screen.includes('KK-2026-08'), false, 'the hardcoded session title is back')
})

test('a closed session cannot be scanned from the UI', () => {
  assert.match(screen, /const isOpen = session\?\.status === 'OPEN'/)
  assert.match(screen, /\{isOpen \? \(/, 'the scan form must be gated on an open session')
})

test('every control on the screen has a handler', () => {
  const buttons = screen.match(/<button[^>]*>/g) ?? []
  const withoutHandler = buttons.filter(tag => !/onClick=|type="submit"/.test(tag))
  assert.deepEqual(withoutHandler, [], `dead controls: ${withoutHandler.join(', ')}`)
})
