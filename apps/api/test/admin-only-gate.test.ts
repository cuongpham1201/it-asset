import assert from 'node:assert/strict'
import test from 'node:test'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { AuthGuard, SELF_SERVICE_PATHS } from '../src/auth/auth.guard'

// AssetFlow is IT-operated: ADMIN is the only supported operational role (P1C).
// These tests pin the single choke point that enforces it, so no controller can
// reopen business access for a legacy role by accident.

function contextFor(path: string, cookie = 'assetflow_session=token') {
  const request: any = { path, headers: { cookie } }
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as any,
  }
}

function guardWith(user: any, isPublic = false) {
  const reflector = { getAllAndOverride: () => isPublic } as any
  const auth = { authenticate: () => Promise.resolve(user) } as any
  return new AuthGuard(reflector, auth)
}

const BUSINESS_PATHS = [
  '/api/v1/assets',
  '/api/v1/assets/some-id',
  '/api/v1/assets/some-id/assignments',
  '/api/v1/assets/some-id/history',
  '/api/v1/assets/summary',
  '/api/v1/asset-history',
  '/api/v1/admin/audit-logs',
  '/api/v1/admin/manufacturers',
  '/api/v1/admin/departments',
  '/api/v1/inventories',
  '/api/v1/asset-imports/stage',
  '/api/v1/settings',
  '/api/v1/incidents',
  '/api/v1/renewals',
  '/api/v1/discovery/inbox',
  '/api/v1/vendors',
]

test('an administrator passes every business endpoint', async () => {
  const guard = guardWith({ id: 'a', role: 'ADMIN', mustChangePassword: false })
  for (const path of BUSINESS_PATHS) {
    assert.equal(await guard.canActivate(contextFor(path).context), true, path)
  }
})

for (const role of ['IT', 'HCNS', 'USER']) {
  test(`a legacy ${role} account is denied on every business endpoint`, async () => {
    const guard = guardWith({ id: 'x', role, mustChangePassword: false })
    for (const path of BUSINESS_PATHS) {
      await assert.rejects(
        () => guard.canActivate(contextFor(path).context),
        ForbiddenException,
        `${role} must be denied on ${path}`,
      )
    }
  })

  test(`a legacy ${role} account keeps self-service access only`, async () => {
    const guard = guardWith({ id: 'x', role, mustChangePassword: false })
    for (const path of SELF_SERVICE_PATHS) {
      assert.equal(await guard.canActivate(contextFor(`/api/v1${path}`).context), true, path)
    }
  })
}

test('the denial names the product decision, not a generic error', async () => {
  const guard = guardWith({ id: 'x', role: 'USER', mustChangePassword: false })
  await assert.rejects(
    () => guard.canActivate(contextFor('/api/v1/assets').context),
    /chỉ dành cho quản trị viên IT/,
  )
})

test('no session is still 401, never 403', async () => {
  const guard = guardWith(null)
  await assert.rejects(() => guard.canActivate(contextFor('/api/v1/assets').context), UnauthorizedException)
})

test('public routes bypass the gate entirely (health, login, agent, metrics)', async () => {
  // authenticate() throws, so reaching `true` proves the public branch was taken.
  const reflector = { getAllAndOverride: () => true } as any
  const auth = { authenticate: () => { throw new Error('must not be called') } } as any
  const guard = new AuthGuard(reflector, auth)
  assert.equal(await guard.canActivate(contextFor('/api/v1/health/ready', '').context), true)
})

test('the identity comes from the session, not from anything the client sends', async () => {
  const guard = guardWith({ id: 'x', role: 'USER', mustChangePassword: false })
  const { request, context } = contextFor('/api/v1/assets')
  // A forged role in headers/body must not matter: the guard only consults authenticate().
  request.headers['x-role'] = 'ADMIN'
  request.body = { role: 'ADMIN' }
  request.query = { role: 'ADMIN' }
  await assert.rejects(() => guard.canActivate(context), ForbiddenException)
})

test('a forced password change still outranks the role gate for admins', async () => {
  const guard = guardWith({ id: 'a', role: 'ADMIN', mustChangePassword: true })
  await assert.rejects(() => guard.canActivate(contextFor('/api/v1/assets').context), /đổi mật khẩu/)
  assert.equal(await guard.canActivate(contextFor('/api/v1/auth/change-password').context), true)
})
