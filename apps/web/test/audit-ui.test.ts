import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { auditActionLabel, auditActionTone, auditEntityLabel, auditQueryString, AUDIT_MAX_LIMIT, AUDIT_PAGE_SIZE } from '../src/api/audit'

const screen = readFileSync(new URL('../src/features/audit/AuditLogScreen.tsx', import.meta.url), 'utf8')
const timeline = readFileSync(new URL('../src/features/assets/AssetHistoryTimeline.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

const params = (query: Parameters<typeof auditQueryString>[0]) => new URLSearchParams(auditQueryString(query))

// ── query ────────────────────────────────────────────────────────────────────

test('an empty audit query still asks for one page', () => {
  const search = params({})
  assert.equal(search.get('page'), '1')
  assert.equal(search.get('limit'), String(AUDIT_PAGE_SIZE))
  assert.deepEqual([...search.keys()].sort(), ['limit', 'page'])
})

test('every audit filter is serialised for the server', () => {
  const search = params({ page: 2, limit: 50, search: ' asset ', action: 'USER_CREATED', entityType: 'User', userId: 'u1', from: '2026-08-01', to: '2026-08-26' })
  assert.equal(search.get('page'), '2')
  assert.equal(search.get('limit'), '50')
  assert.equal(search.get('search'), 'asset')
  assert.equal(search.get('action'), 'USER_CREATED')
  assert.equal(search.get('entityType'), 'User')
  assert.equal(search.get('userId'), 'u1')
  assert.equal(search.get('from'), '2026-08-01')
  assert.equal(search.get('to'), '2026-08-26')
})

test('blank audit filters are dropped and the limit is clamped', () => {
  assert.equal(params({ action: '', entityType: '   ' }).get('action'), null)
  assert.equal(params({ limit: 10000 }).get('limit'), String(AUDIT_MAX_LIMIT))
})

test('the audit module exposes no helper that walks every page', async () => {
  const module = await import('../src/api/audit')
  assert.ok(!Object.keys(module).some(name => /all|every|fetchAllPages/i.test(name)))
})

// ── labelling ────────────────────────────────────────────────────────────────

test('actions and entities read in Vietnamese, unknown codes fall back to the raw value', () => {
  assert.equal(auditActionLabel('ASSET_ASSIGNED'), 'Cấp phát tài sản')
  assert.equal(auditActionLabel('DEPARTMENT_DEACTIVATED'), 'Ngừng phòng ban')
  assert.equal(auditActionLabel('SOMETHING_BRAND_NEW'), 'SOMETHING_BRAND_NEW')
  assert.equal(auditEntityLabel('AssetModel'), 'Model')
  assert.equal(auditEntityLabel('MysteryEntity'), 'MysteryEntity')
})

test('destructive actions are toned apart from creations', () => {
  assert.equal(auditActionTone('VENDOR_DELETED'), 'danger')
  assert.equal(auditActionTone('LOGIN_FAILED'), 'danger')
  assert.equal(auditActionTone('ASSET_RECEIVED'), 'ok')
  assert.equal(auditActionTone('ASSET_METADATA_UPDATED'), 'muted')
})

// ── screen behaviour ─────────────────────────────────────────────────────────

test('the audit screen paginates on the server and resets on filter change', () => {
  assert.match(screen, /listAuditLogs\(query, signal\)/)
  assert.match(screen, /useEffect\(\(\) => \{ setPage\(1\) \}, \[debouncedSearch, action, entityType, userId, from, to, limit\]\)/)
})

test('the audit screen offers loading, error, retry and empty states', () => {
  assert.match(screen, /logs\.loading/)
  assert.match(screen, /logs\.error/)
  assert.match(screen, /onClick=\{logs\.retry\}/)
  assert.match(screen, /Không có bản ghi nào/)
})

test('the audit detail is a real dialog, closable by keyboard, without native prompts', () => {
  assert.match(screen, /role="dialog"/)
  assert.match(screen, /aria-modal="true"/)
  assert.match(screen, /event\.key === 'Escape'/)
  for (const banned of ['window.alert(', 'window.prompt(', 'window.confirm(']) {
    assert.equal(screen.includes(banned), false, `${banned} must not be used`)
  }
})

test('the detail renders before and after rather than raw JSON blobs', () => {
  assert.match(screen, /ValueTable title="Trước"/)
  assert.match(screen, /ValueTable title="Sau"/)
})

// ── the two concepts stay apart ──────────────────────────────────────────────

test('the audit screen is its own page, separate from the asset timeline', () => {
  assert.ok(app.includes("page==='Nhật ký hệ thống'&&isAdmin) content=<AuditLogScreen"), 'audit log needs its own route')
  assert.ok(app.includes("adminOnly=['Danh mục tài sản','Nhật ký hệ thống']"), 'audit log must be admin-only in the nav')
  assert.ok(app.includes("page==='Lịch sử / Audit') content=<TransactionHistory"), 'the asset movement list must remain its own screen')
})

test('the audit screen states plainly that it is not an asset timeline', () => {
  assert.match(screen, /Ai đã thao tác gì trên hệ thống/)
})

test('the asset timeline shows who held the asset, not only who clicked', () => {
  assert.match(timeline, /Người giữ trước/)
  assert.match(timeline, /Người giữ sau/)
  assert.match(timeline, /Thực hiện bởi/)
  assert.match(timeline, /entry\.fromCustodian/)
  assert.match(timeline, /entry\.toCustodian/)
})

test('an unchanged custodian is stated as unchanged instead of faking a handover', () => {
  assert.match(timeline, /không đổi/)
  assert.match(timeline, /entry\.fromCustodian\?\.id === entry\.toCustodian\?\.id/)
})

test('the timeline reads the asset history endpoint rather than a cached array', () => {
  assert.match(timeline, /listAssetHistory\(assetApiId, signal\)/)
  assert.match(app, /<AssetHistoryTimeline assetApiId=\{asset\.apiId\}/)
})
