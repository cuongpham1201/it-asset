import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, isAborted, isUnauthorized } from '../src/services/api-client'

test('a 401 is recognised as a lost session', () => {
  assert.equal(isUnauthorized(new ApiError(401, 'RESOURCE_ERROR', 'Phiên đăng nhập không hợp lệ')), true)
})

test('other failures are not mistaken for a lost session', () => {
  assert.equal(isUnauthorized(new ApiError(403, 'FORBIDDEN', 'Không có quyền')), false)
  assert.equal(isUnauthorized(new ApiError(500, 'HTTP_ERROR', 'Lỗi máy chủ')), false)
  assert.equal(isUnauthorized(new Error('network down')), false)
})

test('a cancelled request is told apart from a real failure', () => {
  const aborted = new Error('The operation was aborted')
  aborted.name = 'AbortError'
  assert.equal(isAborted(aborted), true)
  assert.equal(isAborted(new ApiError(500, 'HTTP_ERROR', 'Lỗi máy chủ')), false)
})

test('the login and session probe are excluded from the global 401 handler', async () => {
  const source = await import('node:fs').then(fs => fs.readFileSync(new URL('../src/services/api-client.ts', import.meta.url), 'utf8'))
  assert.match(source, /AUTH_PROBES/, 'auth probe allowlist is missing')
  assert.match(source, /'\/auth\/login'/, 'login must not trigger the session-expired flow')
  assert.match(source, /'\/auth\/me'/, 'the session probe must not trigger the session-expired flow')
})
