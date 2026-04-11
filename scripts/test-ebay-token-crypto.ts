/**
 * Test eBay Token Crypto
 *
 * Round-trip, format, and error-handling checks for src/lib/ebay-token-crypto.ts.
 * Run via: `npm run test:ebay-crypto` (uses .env.local).
 *
 * This is a smoke test — the repo has no unit-test runner (vitest/jest), so we
 * run it the same way scripts/test-supabase-connection.ts does.
 */

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import crypto from 'crypto'
import {
  encryptEbayToken,
  decryptEbayToken,
  maybeDecryptEbayToken,
} from '../src/lib/ebay-token-crypto'

interface TestResult {
  name: string
  status: 'PASS' | 'FAIL'
  message?: string
}

const results: TestResult[] = []

function assert(name: string, cond: boolean, message?: string) {
  results.push({ name, status: cond ? 'PASS' : 'FAIL', message })
  const icon = cond ? '✅' : '❌'
  console.log(`${icon} ${name}${message ? ` — ${message}` : ''}`)
}

function assertThrows(name: string, fn: () => unknown, matcher?: RegExp) {
  try {
    fn()
    results.push({ name, status: 'FAIL', message: 'expected throw, none thrown' })
    console.log(`❌ ${name} — expected throw`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const ok = !matcher || matcher.test(msg)
    results.push({
      name,
      status: ok ? 'PASS' : 'FAIL',
      message: ok ? undefined : `threw "${msg}", expected match ${matcher}`,
    })
    console.log(
      ok ? `✅ ${name}` : `❌ ${name} — threw "${msg}", expected match ${matcher}`
    )
  }
}

async function main() {
  console.log('🧪 Testing eBay token crypto\n')

  if (!process.env.EBAY_TOKEN_ENCRYPTION_KEY) {
    console.error('❌ EBAY_TOKEN_ENCRYPTION_KEY missing from .env.local — abort')
    process.exit(1)
  }

  // 1. Round-trip
  const sample =
    'v^1.1#i^1#r^0#p^3#I^3#f^0#t^H4sIAAAAAAAA...a-realistic-fake-token'
  const ciphertext = encryptEbayToken(sample)
  assert('round-trip: decrypt matches input', decryptEbayToken(ciphertext) === sample)

  // 2. GCM format: 3 colon-separated hex parts
  const parts = ciphertext.split(':')
  assert('format: 3 parts (GCM iv:tag:ct)', parts.length === 3)
  assert(
    'format: all parts hex',
    parts.every((p) => /^[0-9a-f]+$/.test(p))
  )
  assert('format: IV is 12 bytes (24 hex chars)', parts[0]!.length === 24)
  assert('format: authTag is 16 bytes (32 hex chars)', parts[1]!.length === 32)

  // 3. Nondeterminism — same input, different ciphertexts
  const ct2 = encryptEbayToken(sample)
  assert('nondeterministic: same plaintext → different ciphertext', ciphertext !== ct2)
  assert('nondeterministic: both still decrypt', decryptEbayToken(ct2) === sample)

  // 4. GCM tamper detection — flipping a bit in the ciphertext should throw
  const tampered = (() => {
    const [iv, tag, data] = parts as [string, string, string]
    // Flip the first nibble of the ciphertext
    const flipped = (parseInt(data[0]!, 16) ^ 0x1).toString(16) + data.slice(1)
    return `${iv}:${tag}:${flipped}`
  })()
  assertThrows(
    'tamper: modified ciphertext throws',
    () => decryptEbayToken(tampered)
  )

  // 5. Empty-string passes through
  assert('empty: encrypt returns ""', encryptEbayToken('') === '')
  assert('empty: decrypt returns ""', decryptEbayToken('') === '')

  // 6. maybeDecryptEbayToken — plaintext passthrough
  assert(
    'maybeDecrypt: plaintext row returned as-is',
    maybeDecryptEbayToken('legacy-plaintext-token', false) === 'legacy-plaintext-token'
  )
  assert(
    'maybeDecrypt: null token → empty string',
    maybeDecryptEbayToken(null, true) === ''
  )
  assert(
    'maybeDecrypt: encrypted row decrypts correctly',
    maybeDecryptEbayToken(ciphertext, true) === sample
  )

  // 7. Legacy CBC format (2 parts) is still decryptable — synthesize one
  //    using the same key so we know the backwards-compat branch works.
  const legacyCiphertext = (() => {
    const key = Buffer.from(process.env.EBAY_TOKEN_ENCRYPTION_KEY!, 'base64')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    let enc = cipher.update(sample, 'utf8', 'hex')
    enc += cipher.final('hex')
    return `${iv.toString('hex')}:${enc}`
  })()
  assert(
    'legacy: CBC 2-part ciphertext still decrypts',
    decryptEbayToken(legacyCiphertext) === sample
  )

  // 8. Malformed input
  assertThrows(
    'malformed: single-part ciphertext throws',
    () => decryptEbayToken('notahexblob'),
    /Invalid encrypted eBay token format/
  )
  assertThrows(
    'malformed: 4-part ciphertext throws',
    () => decryptEbayToken('aa:bb:cc:dd'),
    /Invalid encrypted eBay token format/
  )

  // Summary
  console.log('\n' + '='.repeat(50))
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  if (failed > 0) {
    process.exit(1)
  }
  console.log('✅ All crypto tests passed')
}

main().catch((err) => {
  console.error('Test script failed:', err)
  process.exit(1)
})
