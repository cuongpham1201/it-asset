import assert from 'node:assert/strict'
import test from 'node:test'
import { ASSET_MAX_LIMIT, ASSET_PAGE_SIZE, assetQueryString } from '../src/api/assets'

const params = (query: Parameters<typeof assetQueryString>[0]) => new URLSearchParams(assetQueryString(query))

test('an empty query still asks for exactly one page', () => {
  const search = params({})
  assert.equal(search.get('page'), '1')
  assert.equal(search.get('limit'), String(ASSET_PAGE_SIZE))
  assert.deepEqual([...search.keys()].sort(), ['limit', 'page'])
})

test('blank filters are dropped instead of being sent as empty strings', () => {
  const search = params({ search: '   ', category: '', department: undefined, status: '' })
  assert.equal(search.get('search'), null)
  assert.equal(search.get('category'), null)
  assert.equal(search.get('department'), null)
  assert.equal(search.get('status'), null)
})

test('filters, sorting and paging are all serialised for the server', () => {
  const search = params({
    page: 3, limit: 50, search: '  laptop ', category: 'cat-1', department: 'dep-1',
    location: 'loc-1', status: 'READY', assignedUser: 'person-1', lifecycle: 'overdue',
    sort: 'purchaseCost', order: 'desc',
  })
  assert.equal(search.get('page'), '3')
  assert.equal(search.get('limit'), '50')
  assert.equal(search.get('search'), 'laptop')
  assert.equal(search.get('category'), 'cat-1')
  assert.equal(search.get('department'), 'dep-1')
  assert.equal(search.get('location'), 'loc-1')
  assert.equal(search.get('status'), 'READY')
  assert.equal(search.get('assignedUser'), 'person-1')
  assert.equal(search.get('lifecycle'), 'overdue')
  assert.equal(search.get('sort'), 'purchaseCost')
  assert.equal(search.get('order'), 'desc')
})

test('limit is clamped to what the API accepts so a page request can never be rejected', () => {
  assert.equal(params({ limit: 5000 }).get('limit'), String(ASSET_MAX_LIMIT))
  assert.equal(params({ limit: 0 }).get('limit'), '1')
})

test('page numbers below one are corrected rather than sent as-is', () => {
  assert.equal(params({ page: 0 }).get('page'), '1')
  assert.equal(params({ page: -4 }).get('page'), '1')
})

test('the asset API module exposes no helper that walks every page', async () => {
  const module = await import('../src/api/assets')
  const exported = Object.keys(module)
  assert.ok(!exported.some(name => /all|every|fetchAllPages/i.test(name)),
    `load-all helper reintroduced: ${exported.join(', ')}`)
})
