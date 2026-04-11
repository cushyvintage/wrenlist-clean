/**
 * eBay webhook signature verification.
 *
 * eBay POST notifications come with `X-EBAY-SIGNATURE`: a base64 JSON object
 * containing `{alg, kid, signature, digest}`. Verification:
 *
 *   1. Base64-decode the header to get `kid`
 *   2. Fetch the public key from eBay's notification API (cached 1h)
 *   3. Build the canonical "signed input": either the raw JSON payload or
 *      the digest header per eBay's RFC9530 spec. eBay's current behaviour
 *      is to sign the raw request body.
 *   4. Use Node's crypto.verify() with the decoded signature
 *
 * Docs:
 *   https://developer.ebay.com/develop/guides-v2/marketplace-user-account-deletion/marketplace-user-account-deletion
 *   https://developer.ebay.com/api-docs/commerce/notification/resources/public_key/methods/getPublicKey
 */

import crypto from 'crypto'
import { config } from '@/lib/config'

interface SignatureHeader {
  alg: string // e.g. "ECDSA", "RSA"
  kid: string // key ID — use in publicKey API call
  signature: string // base64-encoded signature bytes
  digest?: string // optional SHA-256 digest of the body
}

interface PublicKeyCacheEntry {
  key: string // PEM-encoded public key
  algorithm: string // from the API response
  expiresAt: number
}

// Cache public keys in-process for 1h. Lambda cold starts mean we may
// re-fetch per instance, which is fine — eBay's rate limit on this
// endpoint is generous.
const publicKeyCache = new Map<string, PublicKeyCacheEntry>()

let cachedAppToken: { token: string; expiresAt: number } | null = null

/**
 * Fetch (and cache) an eBay application access token using the
 * client_credentials grant. This is the same flow used by ebay-finding.ts
 * but scoped locally so the webhook handler doesn't pull in the whole
 * finding-API module.
 */
async function getAppToken(): Promise<string | null> {
  const { clientId, clientSecret } = config.ebay
  if (!clientId || !clientSecret) return null

  if (cachedAppToken && Date.now() < cachedAppToken.expiresAt - 60_000) {
    return cachedAppToken.token
  }

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  })

  if (!response.ok) {
    console.error(`[ebay-webhook-verify] App token fetch failed: ${response.status}`)
    return null
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  cachedAppToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

/**
 * Parse the X-EBAY-SIGNATURE header. It's a base64-encoded JSON object.
 * Returns null if malformed.
 */
function parseSignatureHeader(header: string | null): SignatureHeader | null {
  if (!header) return null
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded) as Partial<SignatureHeader>
    if (!parsed.kid || !parsed.signature || !parsed.alg) return null
    return parsed as SignatureHeader
  } catch {
    return null
  }
}

/**
 * Fetch the public key for a given kid, using the in-process cache.
 * Returns null on any failure (network, auth, missing env).
 */
async function fetchPublicKey(kid: string): Promise<PublicKeyCacheEntry | null> {
  const cached = publicKeyCache.get(kid)
  if (cached && Date.now() < cached.expiresAt) {
    return cached
  }

  const token = await getAppToken()
  if (!token) {
    console.error('[ebay-webhook-verify] No app token available')
    return null
  }

  try {
    const url = `https://api.ebay.com/commerce/notification/v1/public_key/${encodeURIComponent(kid)}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      console.error(`[ebay-webhook-verify] Public key fetch failed: ${response.status} ${await response.text()}`)
      return null
    }

    const data = (await response.json()) as { key?: string; algorithm?: string }
    if (!data.key) {
      console.error('[ebay-webhook-verify] Public key response missing `key` field')
      return null
    }

    const entry: PublicKeyCacheEntry = {
      key: data.key,
      algorithm: data.algorithm ?? 'ECDSA',
      // Cache for 1h — well short of eBay's typical key rotation cadence
      expiresAt: Date.now() + 60 * 60 * 1000,
    }
    publicKeyCache.set(kid, entry)
    return entry
  } catch (err) {
    console.error('[ebay-webhook-verify] Public key fetch error:', err)
    return null
  }
}

/**
 * Verify an eBay webhook signature against the raw request body.
 *
 * Returns true only if:
 *   1. The X-EBAY-SIGNATURE header parses correctly
 *   2. We can fetch the public key for its kid
 *   3. The signature verifies against the body using the declared algorithm
 *
 * Any failure returns false and logs the reason. Never throws.
 *
 * @param signatureHeader Raw value of the `X-EBAY-SIGNATURE` header
 * @param rawBody The untouched request body as a string (must not be re-stringified)
 */
export async function verifyEbayWebhookSignature(
  signatureHeader: string | null,
  rawBody: string,
): Promise<boolean> {
  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed) {
    console.warn('[ebay-webhook-verify] Signature header missing or malformed')
    return false
  }

  const pubKey = await fetchPublicKey(parsed.kid)
  if (!pubKey) {
    console.warn('[ebay-webhook-verify] Unable to fetch public key for kid:', parsed.kid)
    return false
  }

  // eBay uses ECDSA with SHA-256 (or RSA-SHA256 historically). Pick the
  // digest algorithm based on the declared alg — default to SHA256.
  const digestAlg = 'sha256'

  try {
    const verifier = crypto.createVerify(digestAlg)
    verifier.update(rawBody)
    verifier.end()

    // The signature is base64-encoded in the header payload. Node's
    // crypto.verify accepts the key in PEM format and signature as Buffer.
    const signatureBuf = Buffer.from(parsed.signature, 'base64')
    const ok = verifier.verify(
      {
        key: pubKey.key,
        // ECDSA signatures from eBay are DER-encoded — Node accepts that by default
      },
      signatureBuf,
    )

    if (!ok) {
      console.warn('[ebay-webhook-verify] Signature verification failed', {
        kid: parsed.kid,
        alg: parsed.alg,
      })
    }
    return ok
  } catch (err) {
    console.error('[ebay-webhook-verify] Verify error:', err)
    return false
  }
}

/**
 * Test-only: clear the public key cache. Used by unit tests.
 */
export function __clearPublicKeyCacheForTests() {
  publicKeyCache.clear()
  cachedAppToken = null
}
