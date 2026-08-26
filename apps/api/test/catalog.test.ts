import assert from 'node:assert/strict'
import test from 'node:test'
import { CatalogService } from '../src/modules/catalog/catalog.service'

const admin = { id: 'admin', role: 'ADMIN' }
const it = { id: 'it', role: 'IT' }

const tx = (overrides: any = {}) => ({
  auditLog: { create: () => Promise.resolve({}) },
  ...overrides,
})

test('only an administrator may create a manufacturer', async () => {
  const service = new CatalogService({} as any)
  await assert.rejects(() => service.createManufacturer({ name: 'Dell' }, it as any), /Chỉ quản trị viên/)
})

test('creating a manufacturer records an audit entry', async () => {
  let audited: any
  const db = {
    $transaction: (run: any) => run(tx({ manufacturer: { create: ({ data }: any) => Promise.resolve({ id: 'm1', ...data }) }, auditLog: { create: ({ data }: any) => { audited = data; return Promise.resolve({}) } } })),
  }
  const created = await new CatalogService(db as any).createManufacturer({ name: 'Dell' }, admin as any)
  assert.equal(created.name, 'Dell')
  assert.equal(audited.action, 'MANUFACTURER_CREATED')
  assert.equal(audited.entityType, 'Manufacturer')
})

test('a duplicate manufacturer name is reported as a conflict', async () => {
  const db = { $transaction: () => Promise.reject(Object.assign(new Error('dup'), { code: 'P2002' })) }
  await assert.rejects(() => new CatalogService(db as any).createManufacturer({ name: 'Dell' }, admin as any), /đã tồn tại/)
})

test('a manufacturer still used by assets cannot be retired', async () => {
  const db = {
    manufacturer: { findUnique: () => Promise.resolve({ id: 'm1', name: 'Dell' }) },
    asset: { count: () => Promise.resolve(3) },
  }
  await assert.rejects(
    () => new CatalogService(db as any).updateManufacturer('m1', { status: 'INACTIVE' }, admin as any),
    /đang được gán cho tài sản/,
  )
})

test('a model must point at an active manufacturer and category', async () => {
  const db = {
    manufacturer: { findFirst: () => Promise.resolve(null) },
    assetCategory: { findFirst: () => Promise.resolve({ id: 'c1' }) },
  }
  await assert.rejects(
    () => new CatalogService(db as any).createModel({ name: 'Latitude', manufacturerId: 'm1', categoryId: 'c1' }, admin as any),
    /Hãng sản xuất không tồn tại/,
  )
})

test('creating a model keeps the manufacturer and category link', async () => {
  let created: any
  const db = {
    manufacturer: { findFirst: () => Promise.resolve({ id: 'm1' }) },
    assetCategory: { findFirst: () => Promise.resolve({ id: 'c1' }) },
    $transaction: (run: any) => run(tx({ assetModel: { create: ({ data }: any) => { created = data; return Promise.resolve({ id: 'mo1', ...data }) } } })),
  }
  const model = await new CatalogService(db as any).createModel({ name: 'Latitude 5440', manufacturerId: 'm1', categoryId: 'c1' }, admin as any)
  assert.equal(model.name, 'Latitude 5440')
  assert.equal(created.manufacturerId, 'm1')
  assert.equal(created.categoryId, 'c1')
})

test('a model still used by assets cannot be retired', async () => {
  const db = {
    assetModel: { findUnique: () => Promise.resolve({ id: 'mo1' }) },
    asset: { count: () => Promise.resolve(2) },
  }
  await assert.rejects(
    () => new CatalogService(db as any).updateModel('mo1', { status: 'INACTIVE' }, admin as any),
    /đang được gán cho tài sản/,
  )
})
