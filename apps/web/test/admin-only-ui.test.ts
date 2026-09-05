import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const roadmap = readFileSync(new URL('../../../docs/ROADMAP-PHASES.md', import.meta.url), 'utf8')

// AssetFlow is IT-operated (P1C): the UI must close itself for legacy accounts
// before any business request is fired — the backend gate is the real barrier,
// this keeps the client honest and quiet.

test('a non-admin account is stopped at a dedicated denial screen', () => {
  assert.match(app, /function AccessDeniedScreen\(/)
  assert.ok(app.includes("if(currentUser.role!=='Admin')return <AccessDeniedScreen"), 'the shell must not render for legacy roles')
  assert.match(app, /Không có quyền truy cập/)
  assert.match(app, /dành riêng cho quản trị viên IT/)
})

test('the denial screen still lets the account leave', () => {
  const screen = app.slice(app.indexOf('function AccessDeniedScreen'), app.indexOf('function LoginScreen'))
  assert.match(screen, /onClick=\{onLogout\}/)
  assert.match(screen, /Đăng xuất/)
})

test('no server query fires for an account that will only ever get 403', () => {
  assert.match(app, /const isAdminOperator=currentUser\?\.role==='Admin'/)
  assert.match(app, /serverMode&&isAdminOperator&&!currentUser\?\.mustChangePassword\?getAssetSummary/)
  assert.match(app, /serverMode&&isAdminOperator&&!currentUser\?\.mustChangePassword\?listAssets/)
  assert.ok(app.includes("currentUser.mustChangePassword||currentUser.role!=='Admin')return"), 'the shell loader must be gated on the admin role')
})

test('the HCNS-scoped navigation branch is gone', () => {
  assert.equal(app.includes('hcnsAllowed'), false, 'dead HCNS menu filtering must not linger')
})

test('the admin experience is untouched: full navigation still renders for Admin', () => {
  for (const item of ['Sổ tài sản', 'Cấp phát & Thu hồi', 'Kiểm kê', 'Danh mục tài sản', 'Nhật ký hệ thống']) {
    assert.ok(app.includes(item), `${item} must remain in the admin navigation`)
  }
})

test('the repo roadmap now states the admin-only model as source of truth', () => {
  assert.match(roadmap, /ADMIN = IT/)
  assert.match(roadmap, /vai trò vận hành duy nhất/)
  assert.match(roadmap, /F-08/)
  assert.match(roadmap, /F-09/)
  assert.match(roadmap, /BY DESIGN/)
  assert.match(roadmap, /do not pre-create role\/permission now/)
})
