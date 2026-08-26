/**
 * Keys whose value must never leave the server, matched case-insensitively as a substring so
 * that `passwordHash`, `bind_password` and `oldClientSecret` are all caught by one entry.
 */
const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'passwd',
  'secret',
  'token',
  'credential',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'session',
  'cookie',
  'signature',
  'otp',
  'pin',
]

export const REDACTED = '[đã ẩn]'

const normalise = (key: string) => key.toLowerCase().replace(/[^a-z]/g, '')

export const isSensitiveKey = (key: string) => {
  const flat = normalise(key)
  return SENSITIVE_KEY_FRAGMENTS.some(fragment => flat.includes(normalise(fragment)))
}

/**
 * Walks a stored audit payload and replaces every sensitive value, at any depth, inside
 * objects and arrays alike. The shape is preserved so a reader can still see that a field
 * changed without learning what it changed to.
 *
 * Redaction happens on read: historical rows are never rewritten, because the audit tables
 * are append-only by design.
 */
export function redactAuditValues(value: unknown, depth = 0): unknown {
  if (depth > 12) return REDACTED // pathological nesting is not worth walking
  if (Array.isArray(value)) return value.map(item => redactAuditValues(item, depth + 1))
  if (value === null || typeof value !== 'object') return value
  const output: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactAuditValues(entry, depth + 1)
  }
  return output
}
