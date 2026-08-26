import assert from 'node:assert/strict'
import test from 'node:test'
import { AssetsService } from '../src/modules/assets/assets.service'

const admin = { id: 'admin', role: 'ADMIN', departmentId: null }

/** Captures the `where` clause the service builds for a list query. */
function listWith(query: any) {
  let captured: any
  const db = {
    $transaction: (operations: any[]) => Promise.all(operations),
    asset: {
      findMany: ({ where, skip, take, orderBy }: any) => { captured = { where, skip, take, orderBy }; return Promise.resolve([]) },
      count: () => Promise.resolve(0),
    },
  }
  const service = new AssetsService(db as any)
  return service.list({ page: 1, limit: 20, sort: 'assetTag', order: 'asc', ...query } as any, admin as any)
    .then(() => captured)
}

test('paging is translated into skip and take', async () => {
  const captured = await listWith({ page: 3, limit: 25 })
  assert.equal(captured.skip, 50)
  assert.equal(captured.take, 25)
})

test('lifecycle=assigned selects assets someone is holding', async () => {
  const captured = await listWith({ lifecycle: 'assigned' })
  assert.deepEqual(captured.where.AND.at(-1), { currentCustodianId: { not: null } })
})

test('lifecycle=in_stock selects unassigned ready assets', async () => {
  const captured = await listWith({ lifecycle: 'in_stock' })
  assert.deepEqual(captured.where.AND.at(-1), { currentCustodianId: null, status: { is: { code: 'READY' } } })
})

test('lifecycle=due selects open assignments that carry a return date', async () => {
  const captured = await listWith({ lifecycle: 'due' })
  const clause = captured.where.AND.at(-1)
  assert.equal(clause.assignments.some.status, 'OPEN')
  assert.deepEqual(clause.assignments.some.expectedReturnDate, { not: null })
})

test('lifecycle=overdue selects open assignments already past their return date', async () => {
  const captured = await listWith({ lifecycle: 'overdue' })
  const clause = captured.where.AND.at(-1)
  assert.equal(clause.assignments.some.status, 'OPEN')
  assert.ok(clause.assignments.some.expectedReturnDate.lt instanceof Date)
})

test('no lifecycle filter leaves the query untouched', async () => {
  const captured = await listWith({})
  assert.deepEqual(captured.where.AND, [])
})

test('an unsafe sort column falls back to the asset tag', async () => {
  const captured = await listWith({ sort: 'passwordHash' })
  assert.deepEqual(captured.orderBy, { assetTag: 'asc' })
})

test('summary returns server-side breakdowns so the client never counts rows itself', async () => {
  const db = {
    asset: {
      count: () => Promise.resolve(7),
      aggregate: () => Promise.resolve({ _sum: { purchaseCost: 1234 } }),
      groupBy: ({ by }: any) => Promise.resolve(
        by[0] === 'categoryId' ? [{ categoryId: 'cat-1', _count: { _all: 5 } }]
          : by[0] === 'statusId' ? [{ statusId: 'st-1', _count: { _all: 4 } }]
            : [{ locationId: null, _count: { _all: 2 } }],
      ),
    },
    assetAssignment: { count: () => Promise.resolve(1) },
    assetCategory: { findMany: () => Promise.resolve([{ id: 'cat-1', name: 'Laptop' }]) },
    assetStatus: { findMany: () => Promise.resolve([{ id: 'st-1', code: 'READY', name: 'Sẵn sàng' }]) },
    location: { findMany: () => Promise.resolve([]) },
  }
  const summary = await new AssetsService(db as any).summary(admin as any)
  assert.equal(summary.total, 7)
  assert.equal(summary.totalValue, 1234)
  assert.deepEqual(summary.byCategory, [{ id: 'cat-1', label: 'Laptop', count: 5 }])
  assert.deepEqual(summary.byStatus, [{ id: 'st-1', code: 'READY', label: 'Sẵn sàng', count: 4 }])
  assert.deepEqual(summary.byLocation, [{ id: null, label: 'Chưa gán vị trí', count: 2 }])
})
