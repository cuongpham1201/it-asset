import assert from 'node:assert/strict'
import test from 'node:test'
import { AuditService } from '../src/modules/audit/audit.service'
import { REDACTED, isSensitiveKey, redactAuditValues } from '../src/modules/audit/audit.redaction'

const admin = { id: 'admin-1', role: 'ADMIN' }

/** Minimal Prisma double that records the query the service builds. */
function auditDb(rows: any[] = [], users: any[] = []) {
  let captured: any
  const db = {
    $transaction: (operations: any[]) => Promise.all(operations),
    auditLog: {
      findMany: (args: any) => { captured = args; return Promise.resolve(rows) },
      count: () => Promise.resolve(rows.length),
      groupBy: ({ by }: any) => Promise.resolve(
        by[0] === 'action' ? [{ action: 'USER_CREATED', _count: { _all: 2 } }, { action: 'LOGIN_SUCCEEDED', _count: { _all: 9 } }]
          : by[0] === 'entityType' ? [{ entityType: 'User', _count: { _all: 3 } }]
            : [{ userId: 'admin-1', _count: { _all: 5 } }],
      ),
    },
    user: { findMany: () => Promise.resolve(users) },
  }
  return { db, captured: () => captured }
}

// ── access control ───────────────────────────────────────────────────────────

for (const role of ['IT', 'HCNS', 'USER']) {
  test(`${role} cannot read the audit trail`, async () => {
    const { db } = auditDb()
    await assert.rejects(
      () => new AuditService(db as any).list({ page: 1, limit: 25 } as any, { id: 'x', role } as any),
      /Chỉ quản trị viên/,
    )
  })
}

test('an administrator can read the audit trail', async () => {
  const { db } = auditDb()
  const result = await new AuditService(db as any).list({ page: 1, limit: 25 } as any, admin as any)
  assert.deepEqual(result.data, [])
  assert.equal(result.meta.total, 0)
})

test('filter options are administrator-only too', async () => {
  const { db } = auditDb()
  await assert.rejects(() => new AuditService(db as any).filterOptions({ id: 'x', role: 'IT' } as any), /Chỉ quản trị viên/)
})

// ── query building ───────────────────────────────────────────────────────────

test('paging maps to skip and take, newest first', async () => {
  const { db, captured } = auditDb()
  await new AuditService(db as any).list({ page: 4, limit: 50 } as any, admin as any)
  assert.equal(captured().skip, 150)
  assert.equal(captured().take, 50)
  assert.deepEqual(captured().orderBy, { createdAt: 'desc' })
})

test('every documented filter reaches the query', async () => {
  const { db, captured } = auditDb()
  await new AuditService(db as any).list({
    page: 1, limit: 25, action: 'USER_CREATED', entityType: 'User',
    entityId: 'entity-1', userId: 'actor-1',
  } as any, admin as any)
  const where = captured().where
  assert.equal(where.action, 'USER_CREATED')
  assert.equal(where.entityType, 'User')
  assert.equal(where.entityId, 'entity-1')
  assert.equal(where.userId, 'actor-1')
})

test('a bare end date covers the whole day', async () => {
  const { db, captured } = auditDb()
  await new AuditService(db as any).list({ page: 1, limit: 25, from: '2026-08-01', to: '2026-08-26' } as any, admin as any)
  const range = captured().where.createdAt
  assert.equal(range.gte.toISOString().startsWith('2026-08-01'), true)
  assert.equal(range.lte.toISOString(), '2026-08-26T23:59:59.999Z')
})

test('free-text search covers the text columns only', async () => {
  const { db, captured } = auditDb()
  await new AuditService(db as any).list({ page: 1, limit: 25, search: ' asset ' } as any, admin as any)
  const or = captured().where.OR
  // entityId is a uuid column; matching it with ILIKE makes Postgres reject the whole query.
  assert.deepEqual(or.map((clause: any) => Object.keys(clause)[0]), ['action', 'entityType'])
  assert.equal(or[0].action.contains, 'asset')
  assert.equal(or[0].action.mode, 'insensitive')
})

test('searching for a uuid matches the entity id exactly', async () => {
  const { db, captured } = auditDb()
  const id = '680cd519-e4ed-4201-9f50-0729c0ed9e40'
  await new AuditService(db as any).list({ page: 1, limit: 25, search: id } as any, admin as any)
  const or = captured().where.OR
  assert.deepEqual(or.map((clause: any) => Object.keys(clause)[0]), ['action', 'entityType', 'entityId'])
  assert.equal(or[2].entityId, id)
})

// ── serialisation ────────────────────────────────────────────────────────────

test('the BigInt primary key is serialised as a string', async () => {
  const { db } = auditDb([{ id: 9007199254740993n, action: 'USER_CREATED', entityType: 'User', entityId: null, createdAt: new Date(), ipAddress: null, userAgent: null, userId: null, oldValues: null, newValues: null }])
  const result = await new AuditService(db as any).list({ page: 1, limit: 25 } as any, admin as any)
  assert.equal(typeof result.data[0].id, 'string')
  assert.equal(result.data[0].id, '9007199254740993')
  assert.doesNotThrow(() => JSON.stringify(result))
})

test('an unknown actor id still renders instead of blanking the row', async () => {
  const { db } = auditDb([{ id: 1n, action: 'USER_CREATED', entityType: 'User', entityId: null, createdAt: new Date(), ipAddress: null, userAgent: null, userId: 'ghost', oldValues: null, newValues: null }], [])
  const result = await new AuditService(db as any).list({ page: 1, limit: 25 } as any, admin as any)
  assert.equal(result.data[0].actor?.id, 'ghost')
})

// ── redaction ────────────────────────────────────────────────────────────────

test('sensitive key names are recognised regardless of casing or separators', () => {
  for (const key of ['password', 'passwordHash', 'temporaryPassword', 'bind_password', 'clientSecret', 'SECRET', 'accessToken', 'refresh_token', 'credentialHash', 'apiKey', 'api_key', 'sessionToken', 'privateKey']) {
    assert.equal(isSensitiveKey(key), true, `${key} must be treated as sensitive`)
  }
  for (const key of ['name', 'code', 'status', 'assetTag', 'departmentId', 'tokenCount']) {
    assert.equal(isSensitiveKey(key), key === 'tokenCount', `${key} classification is wrong`)
  }
})

test('secrets are removed at every depth, inside objects and arrays alike', () => {
  const payload = {
    username: 'admin',
    passwordHash: 'argon2id$hash',
    profile: { email: 'a@b.c', credentialHash: 'nope', nested: { deeper: { accessToken: 'leak-me' } } },
    integrations: [
      { provider: 'entra', clientSecret: 'super-secret', enabled: true },
      { provider: 'ldap', bindPassword: 'p@ss', useTls: true },
    ],
  }
  const safe = redactAuditValues(payload) as any
  assert.equal(safe.username, 'admin')
  assert.equal(safe.passwordHash, REDACTED)
  assert.equal(safe.profile.email, 'a@b.c')
  assert.equal(safe.profile.credentialHash, REDACTED)
  assert.equal(safe.profile.nested.deeper.accessToken, REDACTED)
  assert.equal(safe.integrations[0].clientSecret, REDACTED)
  assert.equal(safe.integrations[0].enabled, true)
  assert.equal(safe.integrations[1].bindPassword, REDACTED)
  assert.equal(JSON.stringify(safe).includes('super-secret'), false)
  assert.equal(JSON.stringify(safe).includes('leak-me'), false)
  assert.equal(JSON.stringify(safe).includes('argon2id'), false)
})

test('redaction preserves shape and leaves plain values alone', () => {
  assert.equal(redactAuditValues(null), null)
  assert.equal(redactAuditValues('plain'), 'plain')
  assert.equal(redactAuditValues(42), 42)
  assert.deepEqual(redactAuditValues([1, 'two', null]), [1, 'two', null])
})

test('the read path redacts before anything leaves the service', async () => {
  const { db } = auditDb([{
    id: 1n, action: 'USER_CREATED', entityType: 'User', entityId: 'u1', createdAt: new Date(),
    ipAddress: '10.0.0.1', userAgent: 'curl', userId: null,
    oldValues: null, newValues: { username: 'bob', temporaryPassword: '初始密码!23', meta: { token: 'abc' } },
  }])
  const result = await new AuditService(db as any).list({ page: 1, limit: 25 } as any, admin as any)
  const serialised = JSON.stringify(result)
  assert.equal(serialised.includes('Initial'), false)
  assert.equal(serialised.includes('abc'), false)
  assert.equal((result.data[0].newValues as any).temporaryPassword, REDACTED)
  assert.equal((result.data[0].newValues as any).meta.token, REDACTED)
  assert.equal((result.data[0].newValues as any).username, 'bob')
})
