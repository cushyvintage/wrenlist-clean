import crypto from 'crypto'

/**
 * eBay token encryption.
 *
 * Tokens are stored in `ebay_tokens.access_token` and
 * `ebay_tokens.refresh_token`. Encrypted rows are flagged with
 * `token_encrypted = true`; legacy plaintext rows keep working until their
 * next natural refresh, at which point the write path re-encrypts them.
 *
 * Format (new writes): `iv_hex:authTag_hex:ciphertext_hex` using AES-256-GCM
 * with a 32-byte key supplied via `EBAY_TOKEN_ENCRYPTION_KEY` (base64).
 *
 * Legacy format (pre-2026-04-11): `iv_hex:ciphertext_hex` using AES-256-CBC.
 * Decrypt is backwards-compatible — reads detect the format by part count
 * and rows re-encrypt as GCM on their next natural refresh.
 */

const ENV_KEY = 'EBAY_TOKEN_ENCRYPTION_KEY'
const GCM_ALGO = 'aes-256-gcm'
const CBC_ALGO = 'aes-256-cbc'
const IV_BYTES = 12 // GCM recommended IV length

function getKey(): Buffer {
  const raw = process.env[ENV_KEY]
  if (!raw) {
    throw new Error(
      `${ENV_KEY} is not set. Generate one with \`openssl rand -base64 32\` and add it to Vercel + .env.local before writing eBay tokens.`
    )
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) {
    throw new Error(
      `${ENV_KEY} must decode to 32 bytes (base64-encoded). Got ${buf.length} bytes.`
    )
  }
  return buf
}

/**
 * Encrypts with AES-256-GCM. Returns `iv:authTag:ciphertext` (all hex).
 * Empty input passes through unchanged so callers don't have to special-case.
 */
export function encryptEbayToken(plain: string): string {
  if (!plain) return plain
  const key = getKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(GCM_ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

/**
 * Decrypts a token written by `encryptEbayToken`. Supports both the current
 * GCM format (3 colon-separated parts) and the legacy CBC format (2 parts).
 */
export function decryptEbayToken(ciphertext: string): string {
  if (!ciphertext) return ciphertext
  const key = getKey()
  const parts = ciphertext.split(':')

  if (parts.length === 3) {
    // New GCM format: iv:authTag:ciphertext
    const [ivHex, tagHex, dataHex] = parts as [string, string, string]
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error('Invalid encrypted eBay token format (GCM parts empty)')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(tagHex, 'hex')
    const decipher = crypto.createDecipheriv(GCM_ALGO, key, iv)
    decipher.setAuthTag(authTag)
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ])
    return plain.toString('utf8')
  }

  if (parts.length === 2) {
    // Legacy CBC format: iv:ciphertext (16-byte IV, no auth tag)
    const [ivHex, dataHex] = parts as [string, string]
    if (!ivHex || !dataHex) {
      throw new Error('Invalid encrypted eBay token format (CBC parts empty)')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(CBC_ALGO, key, iv)
    let decrypted = decipher.update(dataHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  throw new Error(
    `Invalid encrypted eBay token format: expected 2 (legacy CBC) or 3 (GCM) colon-separated parts, got ${parts.length}`
  )
}

/**
 * Read-path helper. Returns the plaintext token regardless of whether the
 * row is flagged as encrypted. Legacy plaintext rows (`isEncrypted = false`)
 * are returned unchanged so nothing breaks during gradual migration.
 */
export function maybeDecryptEbayToken(
  token: string | null | undefined,
  isEncrypted: boolean | null | undefined
): string {
  if (!token) return ''
  if (!isEncrypted) return token
  return decryptEbayToken(token)
}
