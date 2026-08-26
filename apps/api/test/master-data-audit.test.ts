import assert from 'node:assert/strict'
import test from 'node:test'
import { MasterDataService } from '../src/modules/master-data/master-data.service'

const admin = { id: 'admin-1', role: 'ADMIN' }
const it = { id: 'it-1', role: 'IT' }

/** Captures every audit row a transaction writes. */
function trackingDb(overrides: any = {}) {
  const audits: any[] = []
  const tx = { auditLog: { create: ({ data }: any) => { audits.push(data); return Promise.resolve({}) } }, ...overrides }
  return { audits, db: { $transaction: (run: any) => run(tx), ...overrides } }
}

test('only an administrator may touch master data', async () => {
  const service = new MasterDataService({} as any)
  await assert.rejects(() => service.createDepartment({ code: 'X', name: 'X' } as any, it as any), /Chỉ Admin/)
  await assert.rejects(() => service.createLocation({ code: 'X', name: 'X' } as any, it as any), /Chỉ Admin/)
})

test('creating a department is audited with the resulting snapshot', async () => {
  const { audits, db } = trackingDb({ department: { create: ({ data }: any) => Promise.resolve({ id: 'd1', status: 'ACTIVE', ...data }) } })
  await new MasterDataService(db as any).createDepartment({ code: 'cntt', name: ' Phòng CNTT ' } as any, admin as any)
  assert.equal(audits.length, 1)
  assert.equal(audits[0].action, 'DEPARTMENT_CREATED')
  assert.equal(audits[0].entityType, 'Department')
  assert.equal(audits[0].userId, 'admin-1')
  assert.equal(audits[0].newValues.code, 'CNTT')
  assert.equal(audits[0].newValues.name, 'Phòng CNTT')
})

test('updating a department records both the previous and the new snapshot', async () => {
  const existing = { id: 'd1', code: 'OLD', name: 'Cũ', status: 'ACTIVE', isIncidentResponseTeam: false }
  const { audits, db } = trackingDb({
    department: { findUnique: () => Promise.resolve(existing), update: ({ data }: any) => Promise.resolve({ ...existing, ...data }) },
  })
  await new MasterDataService(db as any).updateDepartment('d1', { code: 'NEW', name: 'Mới' } as any, admin as any)
  assert.equal(audits[0].action, 'DEPARTMENT_UPDATED')
  assert.equal(audits[0].oldValues.code, 'OLD')
  assert.equal(audits[0].newValues.code, 'NEW')
})

test('retiring a department is its own action, and is blocked while it is still in use', async () => {
  const existing = { id: 'd1', code: 'D', name: 'D', status: 'ACTIVE', isIncidentResponseTeam: false }
  const busy = {
    department: { findUnique: () => Promise.resolve(existing) },
    asset: { count: () => Promise.resolve(2) },
    person: { count: () => Promise.resolve(0) },
  }
  await assert.rejects(() => new MasterDataService(busy as any).removeDepartment('d1', admin as any), /đang có người dùng hoặc tài sản/)

  const { audits, db } = trackingDb({
    department: { findUnique: () => Promise.resolve(existing), update: ({ data }: any) => Promise.resolve({ ...existing, ...data }) },
    asset: { count: () => Promise.resolve(0) },
    person: { count: () => Promise.resolve(0) },
  })
  await new MasterDataService(db as any).removeDepartment('d1', admin as any)
  assert.equal(audits[0].action, 'DEPARTMENT_DEACTIVATED')
  assert.equal(audits[0].oldValues.status, 'ACTIVE')
  assert.equal(audits[0].newValues.status, 'INACTIVE')
})

test('creating a site is audited together with the warehouse it implies', async () => {
  const { audits, db } = trackingDb({
    location: { create: ({ data }: any) => Promise.resolve({ id: 'l1', status: 'ACTIVE', address: null, ...data }) },
    warehouse: { create: ({ data }: any) => Promise.resolve({ id: 'w1', ...data }) },
  })
  await new MasterDataService(db as any).createLocation({ code: 'hn', name: 'Hà Nội' } as any, admin as any)
  assert.equal(audits[0].action, 'LOCATION_CREATED')
  assert.equal(audits[0].newValues.code, 'HN')
  assert.equal(audits[0].newValues.defaultWarehouseCode, 'KHO-HN')
})

test('retiring a site is blocked while its warehouse still holds assets', async () => {
  const db = {
    location: { findUnique: () => Promise.resolve({ id: 'l1', code: 'HN', name: 'Hà Nội', address: null, status: 'ACTIVE' }) },
    asset: { count: () => Promise.resolve(0) },
    warehouse: { count: () => Promise.resolve(1) },
  }
  await assert.rejects(() => new MasterDataService(db as any).removeLocation('l1', admin as any), /đang có kho chứa tài sản/)
})
