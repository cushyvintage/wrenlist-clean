#!/usr/bin/env npx tsx
/**
 * refresh-marketplace-data.ts
 *
 * Refreshes marketplace static data files from live APIs.
 * Run manually when marketplace category trees change (monthly recommended).
 *
 * Usage:
 *   npx tsx scripts/refresh-marketplace-data.ts
 *   npx tsx scripts/refresh-marketplace-data.ts --marketplace vinted
 *   npx tsx scripts/refresh-marketplace-data.ts --marketplace ebay
 *
 * Output: src/data/marketplace/*.json
 *
 * NOTE: Vinted requires a valid session cookie (VINTED_SESSION env var).
 * Get this by:
 *   1. Log in to vinted.co.uk in browser
 *   2. DevTools → Application → Cookies → vinted.co.uk
 *   3. Copy the _vinted_fr_session cookie value
 *   4. Set: export VINTED_SESSION="<value>"
 *
 * eBay: No auth required for browse API category fetch.
 * Etsy: No auth required for taxonomy fetch.
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const OUT_DIR = join(process.cwd(), 'src/data/marketplace')

// ─── VINTED ───────────────────────────────────────────────────────────────────

async function refreshVintedCategories() {
  const session = process.env.VINTED_SESSION
  if (!session) {
    console.warn('⚠️  VINTED_SESSION not set. Using cached data.')
    return
  }

  console.log('Fetching Vinted categories...')
  const res = await fetch('https://www.vinted.co.uk/api/v2/catalog/items/facets', {
    headers: {
      'Cookie': `_vinted_fr_session=${session}`,
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  if (!res.ok) {
    // Try alternative endpoint
    const res2 = await fetch('https://www.vinted.co.uk/api/v2/catalogs', {
      headers: {
        'Cookie': `_vinted_fr_session=${session}`,
        'Accept': 'application/json',
      },
    })
    if (!res2.ok) {
      console.error(`Vinted categories fetch failed: ${res2.status}`)
      return
    }
    const data = await res2.json()
    writeFileSync(join(OUT_DIR, 'vinted-categories.json'), JSON.stringify(data.catalogs || data, null, 2))
    console.log('✅ Vinted categories saved')
    return
  }

  const data = await res.json()
  writeFileSync(join(OUT_DIR, 'vinted-categories.json'), JSON.stringify(data, null, 2))
  console.log('✅ Vinted categories saved')
}

async function refreshVintedColors() {
  const session = process.env.VINTED_SESSION
  if (!session) {
    console.warn('⚠️  VINTED_SESSION not set. Skipping colors refresh.')
    return
  }

  console.log('Fetching Vinted colours...')
  const res = await fetch('https://www.vinted.co.uk/api/v2/colors', {
    headers: {
      'Cookie': `_vinted_fr_session=${session}`,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    console.error(`Vinted colours fetch failed: ${res.status}`)
    return
  }

  const data = await res.json()
  const colours = (data.colors || data).map((c: any) => ({
    id: c.id,
    name: c.title || c.name,
    hex: c.hex || null,
    code: c.code || null,
  }))
  writeFileSync(join(OUT_DIR, 'vinted-colors.json'), JSON.stringify(colours, null, 2))
  console.log(`✅ Vinted colours saved (${colours.length} colours)`)
}

// ─── EBAY ─────────────────────────────────────────────────────────────────────
// eBay category fetch uses the Browse API — no OAuth needed for read-only
// For full item specifics per category, use the Taxonomy API (requires app key)

async function refreshEbayCategories() {
  console.log('eBay categories: use static mapping for now (Taxonomy API requires app key)')
  console.log('Set EBAY_APP_ID env var for live fetch.')

  const appId = process.env.EBAY_APP_ID
  if (!appId) {
    console.warn('⚠️  EBAY_APP_ID not set. Skipping eBay categories refresh.')
    return
  }

  // Get OAuth token (client credentials flow)
  const secret = process.env.EBAY_CERT_ID
  const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${appId}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  })

  const tokenData = await tokenRes.json()
  const token = tokenData.access_token

  // Fetch category tree for UK marketplace (EBAY_GB = site ID 3)
  const res = await fetch('https://api.ebay.com/commerce/taxonomy/v1/category_tree/3', {
    headers: { 'Authorization': `Bearer ${token}` },
  })

  if (!res.ok) {
    console.error(`eBay categories fetch failed: ${res.status}`)
    return
  }

  const data = await res.json()
  writeFileSync(join(OUT_DIR, 'ebay-categories.json'), JSON.stringify(data, null, 2))
  console.log('✅ eBay categories saved')
}

// ─── ETSY ─────────────────────────────────────────────────────────────────────

async function refreshEtsyCategories() {
  console.log('Fetching Etsy taxonomy...')
  const res = await fetch('https://openapi.etsy.com/v3/application/seller-taxonomy/nodes', {
    headers: {
      'x-api-key': process.env.ETSY_API_KEY || '',
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    console.warn(`Etsy taxonomy fetch failed: ${res.status} (need ETSY_API_KEY)`)
    return
  }

  const data = await res.json()
  writeFileSync(join(OUT_DIR, 'etsy-categories.json'), JSON.stringify(data, null, 2))
  console.log('✅ Etsy categories saved')
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const marketplace = args.find(a => a.startsWith('--marketplace='))?.split('=')[1]
    || (args.indexOf('--marketplace') >= 0 ? args[args.indexOf('--marketplace') + 1] : null)

  console.log(`\n🔄 Wrenlist Marketplace Data Refresh`)
  console.log(`Output: ${OUT_DIR}\n`)

  if (!marketplace || marketplace === 'vinted') {
    await refreshVintedCategories()
    await refreshVintedColors()
  }

  if (!marketplace || marketplace === 'ebay') {
    await refreshEbayCategories()
  }

  if (!marketplace || marketplace === 'etsy') {
    await refreshEtsyCategories()
  }

  console.log('\n✅ Done. Commit updated files to repo.')
  console.log('   git add src/data/marketplace/ && git commit -m "data: refresh marketplace categories"')
}

main().catch(console.error)
