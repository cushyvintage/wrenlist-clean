import crypto from 'crypto'

/**
 * eBay token encryption.
 *
 * Tokens are stored in `ebay_tokens.access_token` and
 * `ebay_tokens.refresh_token`. Encrypted rows are flagged with
 * `token_encrypted = true`; legacy plaintext rows keep working until their
 * next natural refresh, at which point the write path re-encrypts them.
 *
 * Format: `iv_hex:ciphertext_hex` using AES-256-CBC with a 32-byte key
 * supplied via `EBAY_TOKEN_ENCRYPTION_KEY` (base64).
 */

const ENV_KEY = 'EBAY_TOKEN_ENCRYPTION_KEY'

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

export function encryptEbayToken(plain: string): string {
  if (!plain) return plain
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(plain, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export function decryptEbayToken(ciphertext: string): string {
  if (!ciphertext) return ciphertext
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid encrypted eBay token format (expected iv:ciphertext)')
  }
  const [ivHex, encrypted] = parts as [string, string]
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
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
