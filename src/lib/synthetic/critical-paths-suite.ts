/**
 * Critical-paths suite — concrete steps walked by the runner. Each step
 * resolves to passed/failed/skipped + a details payload. Adding a new
 * critical path = adding a new function here and wiring it into runSuite.
 *
 * Order matters: later steps depend on artefacts created by earlier ones
 * (find_id from create → publish → delist). Cleanup runs in finally and
 * gets called regardless of where the chain broke.
 */

import {
  api,
  cleanupArtefacts,
  runStep,
  SAFETY_DESCRIPTION,
  SAFETY_PRICE,
  SAFETY_SKU_PREFIX,
  SAFETY_TITLE,
  type RunnerContext,
  type StepResult,
} from './runner'

interface SuiteState {
  /** Find created by the first step, reused by publish/delist/edit/cleanup. */
  findId?: string
  /** eBay listing ID after a successful publish — set on PMD by the route. */
  ebayListingId?: string
}

const SAFE_PHOTO = 'https://api.wrenlist.com/storage/v1/object/public/find-photos/fda20546-82af-4818-8fdc-bbc85c3f87c8/shopify-14991500247384-0.jpg'

/**
 * Step 1 — create a synthetic find with the safety markings.
 */
async function stepCreateFind(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'add_find.create', async () => {
    const stamp = Date.now().toString(36).toUpperCase()
    const sku = SAFETY_SKU_PREFIX + stamp
    const { status, body } = await api(ctx, 'POST', '/api/finds', {
      // Title looks like a normal listing — bot-spam classifiers on
      // marketplaces (Vinted especially) flag obvious "TEST" strings
      // and can hurt seller reputation. The £999 price + DB-side SKU
      // prefix do the safety work instead.
      name: SAFETY_TITLE,
      asking_price_gbp: SAFETY_PRICE,
      category: 'other',
      sku,
      status: 'draft',
      selected_marketplaces: ['ebay'],
      brand: 'Internal QA',
      condition: 'good',
      description: SAFETY_DESCRIPTION,
      shipping_weight_grams: 200,
      shipping_length_cm: 10,
      shipping_width_cm: 10,
      shipping_height_cm: 10,
      // Pre-stuff the aspects the publish step will need so we don't
      // depend on category-suggester picking a known leaf.
      platform_fields: {
        ebay: {
          aspects: {
            Department: 'Unisex',
            Brand: 'Unbranded',
            Type: 'Vintage',
            Style: 'Vintage',
            Material: 'Mixed',
            Colour: 'Multicoloured',
            MPN: 'Does not apply',
            EAN: 'Does not apply',
          },
        },
      },
    })
    if (status !== 201) {
      return { status: 'failed', details: { http_status: status, body } }
    }
    const created = (body as { data?: { id?: string } })?.data
    state.findId = created?.id
    if (!state.findId) {
      return { status: 'failed', details: { reason: 'no id in response', body } }
    }

    // Patch in a photo via service-role (the photo upload API needs a
    // multipart post; we sidestep by setting one directly on the row).
    // The publish step requires at least one photo to satisfy eBay.
    await ctx.supabase.from('finds').update({ photos: [SAFE_PHOTO] }).eq('id', state.findId)

    return { status: 'passed', details: { find_id: state.findId, sku } }
  })
}

/**
 * Step 2 — verify the find appears via the read endpoint.
 */
async function stepFetchFind(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'add_find.fetch', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find from create' } }
    const { status, body } = await api(ctx, 'GET', `/api/finds/${state.findId}`)
    if (status !== 200) return { status: 'failed', details: { http_status: status } }
    const data = (body as { data?: { id?: string; name?: string } })?.data
    if (data?.id !== state.findId) {
      return { status: 'failed', details: { reason: 'id mismatch', returned: data?.id } }
    }
    return { status: 'passed', details: { name: data?.name } }
  })
}

/**
 * Step 3 — publish the find to eBay LIVE.
 */
async function stepPublishEbay(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'publish.ebay', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find from create' } }
    const { status, body } = await api(ctx, 'POST', '/api/ebay/publish', {
      findId: state.findId,
      dryRun: false,
    })
    if (status !== 200) return { status: 'failed', details: { http_status: status, body } }
    const data = (body as { data?: { listingId?: string; listingUrl?: string } })?.data
    state.ebayListingId = data?.listingId
    if (!state.ebayListingId) {
      return { status: 'failed', details: { reason: 'no listingId in response', body } }
    }
    return {
      status: 'passed',
      details: {
        listing_id: state.ebayListingId,
        listing_url: data?.listingUrl,
      },
    }
  })
}

/**
 * Step 4 — verify PMD row reflects the live listing.
 */
async function stepVerifyListed(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'publish.ebay.verify_pmd', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find' } }
    const { data, error } = await ctx.supabase
      .from('product_marketplace_data')
      .select('status, platform_listing_id, listing_price')
      .eq('find_id', state.findId)
      .eq('marketplace', 'ebay')
      .maybeSingle()
    if (error) return { status: 'failed', details: { db_error: error.message } }
    if (!data) return { status: 'failed', details: { reason: 'no PMD row created' } }
    if (data.status !== 'listed') {
      return { status: 'failed', details: { pmd_status: data.status } }
    }
    return { status: 'passed', details: data }
  })
}

/**
 * Step 5 — delist via the same endpoint the UI uses.
 */
async function stepDelistEbay(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'delist.ebay', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find' } }
    const { status, body } = await api(ctx, 'POST', '/api/crosslist/delist', {
      findId: state.findId,
      marketplace: 'ebay',
    })
    if (status !== 200) return { status: 'failed', details: { http_status: status, body } }
    return { status: 'passed', details: { http_status: status } }
  })
}

/**
 * Step 6 — verify PMD flipped to delisted.
 */
async function stepVerifyDelisted(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'delist.ebay.verify_pmd', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find' } }
    // Give the dual-write a moment — listing_status update + jobs row + PMD
    // are sequenced; under load the read-after-write can race.
    await new Promise((r) => setTimeout(r, 1500))
    const { data, error } = await ctx.supabase
      .from('product_marketplace_data')
      .select('status, platform_listing_id')
      .eq('find_id', state.findId)
      .eq('marketplace', 'ebay')
      .maybeSingle()
    if (error) return { status: 'failed', details: { db_error: error.message } }
    if (!data) return { status: 'failed', details: { reason: 'PMD row vanished' } }
    if (data.status !== 'delisted' && data.status !== 'ended') {
      return { status: 'failed', details: { pmd_status: data.status } }
    }
    return { status: 'passed', details: data }
  })
}

/**
 * Step 7 — edit the find (mark sold), verify update lands.
 */
async function stepEditFind(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'find.edit', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find' } }
    const { status } = await api(ctx, 'PATCH', `/api/finds/${state.findId}`, {
      brand: 'Synthetic Edited',
      condition: 'very_good',
    })
    if (status !== 200) return { status: 'failed', details: { http_status: status } }

    const { data } = await ctx.supabase
      .from('finds')
      .select('brand, condition')
      .eq('id', state.findId)
      .maybeSingle()
    if (data?.brand !== 'Synthetic Edited' || data?.condition !== 'very_good') {
      return { status: 'failed', details: { reason: 'update not persisted', read_back: data } }
    }
    return { status: 'passed', details: data }
  })
}

/**
 * Step 8 — invalid POSTs must be rejected by validation.
 * Catches the form-hardening regression class. No artefacts created.
 */
async function stepValidationGuards(ctx: RunnerContext) {
  return runStep(ctx, 'form_validation.regressions', async () => {
    const cases: Array<[string, () => Promise<number>]> = [
      ['profile.bad_phone', async () => (await api(ctx, 'PATCH', '/api/profiles/me', { phone: 'definitely_not_a_phone' })).status],
      ['expense.bad_category', async () => (await api(ctx, 'POST', '/api/expenses', { amount_gbp: 1, category: 'totally_made_up' })).status],
      ['sourcing.negative_miles', async () => (await api(ctx, 'POST', '/api/sourcing', { name: 'x', type: 'car_boot', date: new Date().toISOString().slice(0, 10), miles: -5 })).status],
      ['finds.long_name', async () => (await api(ctx, 'POST', '/api/finds', { name: 'a'.repeat(300) })).status],
      ['supplier.bad_phone', async () => (await api(ctx, 'POST', '/api/suppliers', { name: 'x', type: 'car_boot', phone: '🤖' })).status],
    ]
    const results: Record<string, number> = {}
    let allRejected = true
    for (const [name, fn] of cases) {
      const status = await fn()
      results[name] = status
      if (status !== 400) allRejected = false
    }
    return { status: allRejected ? 'passed' : 'failed', details: results }
  })
}

/**
 * Step 9 — verify the publish-queue mechanism for non-eBay platforms.
 * Vinted/Etsy/Depop publish goes via the desktop extension, which the
 * synthetic runner can't drive headless. But we CAN verify the queue
 * write/read contract — the part the extension polls — without ever
 * touching the live marketplace. Catches regressions in:
 *   - PMD upsert when the UI queues a publish
 *   - The needs_publish → listed status flip on extension reporting back
 *   - find lookup + ownership filter
 */
async function stepVintedQueueRoundtrip(ctx: RunnerContext, state: SuiteState) {
  return runStep(ctx, 'publish.queue.vinted', async () => {
    if (!state.findId) return { status: 'skipped', details: { reason: 'no find' } }

    // 1. Insert a needs_publish PMD row directly (the UI's queue path
    //    goes through a different endpoint per platform; we test the
    //    extension's view of the queue here, not the UI's writer).
    const { error: insertErr } = await ctx.supabase
      .from('product_marketplace_data')
      .upsert(
        { find_id: state.findId, marketplace: 'vinted', status: 'needs_publish' },
        { onConflict: 'find_id,marketplace' },
      )
    if (insertErr) {
      return { status: 'failed', details: { stage: 'queue_insert', error: insertErr.message } }
    }

    // 2. Hit the extension-facing queue endpoint as the user — we should
    //    see our find_id in the returned list.
    const { status: getStatus, body: getBody } = await api(ctx, 'GET', '/api/marketplace/publish-queue')
    if (getStatus !== 200) {
      return { status: 'failed', details: { stage: 'queue_read', http_status: getStatus, body: getBody } }
    }
    const items = ((getBody as { data?: unknown[] })?.data ?? []) as Array<{ find_id: string; marketplace: string }>
    const found = items.find((i) => i.find_id === state.findId && i.marketplace === 'vinted')
    if (!found) {
      return { status: 'failed', details: { stage: 'queue_read', reason: 'find not in queue', queue_size: items.length } }
    }

    // 3. Simulate extension reporting back success (the POST endpoint
    //    flips status to 'listed' and stores listing_id/url).
    const { status: postStatus, body: postBody } = await api(ctx, 'POST', '/api/marketplace/publish-queue', {
      find_id: state.findId,
      marketplace: 'vinted',
      status: 'listed',
      platform_listing_id: 'SYN-VINTED-' + Date.now(),
      platform_listing_url: 'https://www.vinted.co.uk/items/synthetic',
    })
    if (postStatus !== 200) {
      return { status: 'failed', details: { stage: 'queue_report', http_status: postStatus, body: postBody } }
    }

    // 4. Read PMD back to confirm the flip.
    const { data: pmd, error: readErr } = await ctx.supabase
      .from('product_marketplace_data')
      .select('status, platform_listing_id')
      .eq('find_id', state.findId)
      .eq('marketplace', 'vinted')
      .maybeSingle()
    if (readErr || !pmd || pmd.status !== 'listed') {
      return { status: 'failed', details: { stage: 'verify_listed', pmd_row: pmd, db_error: readErr?.message } }
    }

    return { status: 'passed', details: { final_pmd_status: pmd.status, listing_id: pmd.platform_listing_id } }
  })
}

/**
 * Step 10 — stash CRUD: create → list → rename → delete.
 * Stashes back the inventory location feature on /finds; if create
 * silently breaks the user can't organise anything physical.
 */
async function stepStashCrud(ctx: RunnerContext) {
  return runStep(ctx, 'stash.crud', async () => {
    const stamp = Date.now().toString(36).toUpperCase()
    // Stashes never leave Wrenlist (not pushed to any marketplace), so the
    // bot-spam concern doesn't apply — but using SAFETY_SKU_PREFIX keeps
    // the cleanup query consistent across artefact types.
    const name = SAFETY_SKU_PREFIX + 'STASH-' + stamp
    const cleanupIds: string[] = []
    try {
      // Create
      const create = await api(ctx, 'POST', '/api/stashes', { name, capacity: 50 })
      if (create.status !== 201) {
        return { status: 'failed', details: { stage: 'create', http_status: create.status, body: create.body } }
      }
      const stash = (create.body as { data?: { id?: string } })?.data
      if (!stash?.id) {
        return { status: 'failed', details: { stage: 'create', reason: 'no id', body: create.body } }
      }
      cleanupIds.push(stash.id)

      // List — must include our stash
      const list = await api(ctx, 'GET', '/api/stashes')
      const listed = ((list.body as { data?: unknown[] })?.data ?? []) as Array<{ id: string }>
      if (!listed.find((s) => s.id === stash.id)) {
        return { status: 'failed', details: { stage: 'list', reason: 'created stash not in list' } }
      }

      // Rename via PATCH
      const renamed = name + ' renamed'
      const patch = await api(ctx, 'PATCH', `/api/stashes/${stash.id}`, { name: renamed })
      if (patch.status !== 200) {
        return { status: 'failed', details: { stage: 'rename', http_status: patch.status, body: patch.body } }
      }

      // Delete
      const del = await api(ctx, 'DELETE', `/api/stashes/${stash.id}`)
      if (del.status !== 200) {
        return { status: 'failed', details: { stage: 'delete', http_status: del.status, body: del.body } }
      }

      return { status: 'passed', details: { lifecycle: 'create→list→rename→delete', stash_id: stash.id } }
    } finally {
      // Best-effort cleanup if we bailed before delete
      for (const id of cleanupIds) {
        try {
          await ctx.supabase.from('stashes').delete().eq('id', id).eq('user_id', ctx.userId)
        } catch { /* ignore */ }
      }
    }
  })
}

/**
 * Step 12 — mark-sold cross-marketplace auto-delist propagation.
 *
 * The most stressful user moment: a sale comes in on Vinted, the user
 * marks the find sold, and EVERY other marketplace must auto-queue a
 * delist so the cross-listed item doesn't sell twice. This test:
 *
 *   1. Creates a fresh "sold-test" find (separate from the eBay live
 *      publish find so we don't entangle the two flows)
 *   2. Seeds two synthetic PMD rows (vinted + etsy, status='listed')
 *      to simulate the find being live on multiple platforms
 *   3. PATCHes find status → 'sold'
 *   4. Verifies BOTH PMD rows flipped to 'needs_delist' (which is what
 *      the extension polls to do the platform-side delist)
 *
 * If this step ever goes red, double-selling is a real possibility —
 * page the user immediately.
 */
async function stepMarkSoldAutoDelist(ctx: RunnerContext) {
  return runStep(ctx, 'mark_sold.auto_delist', async () => {
    const stamp = Date.now().toString(36).toUpperCase()
    const sku = SAFETY_SKU_PREFIX + 'SOLD-' + stamp

    // Create the find via the API so we exercise the same insert path.
    // Note: this find never goes live on any marketplace (only seeded
    // PMDs are inserted), but we still use the bot-spam-safe naming
    // for consistency.
    const created = await api(ctx, 'POST', '/api/finds', {
      name: SAFETY_TITLE,
      asking_price_gbp: SAFETY_PRICE,
      category: 'other',
      sku,
      status: 'listed',
      brand: 'Internal QA',
      condition: 'good',
      description: SAFETY_DESCRIPTION,
    })
    if (created.status !== 201) {
      return { status: 'failed', details: { stage: 'create', http_status: created.status, body: created.body } }
    }
    const findId = (created.body as { data?: { id?: string } })?.data?.id
    if (!findId) {
      return { status: 'failed', details: { stage: 'create', reason: 'no id', body: created.body } }
    }

    try {
      // Seed two PMD rows — listed on vinted + etsy. These simulate the
      // cross-listing state without touching live marketplaces.
      const seedRows = [
        { find_id: findId, marketplace: 'vinted', status: 'listed', platform_listing_id: 'SYN-V-' + stamp },
        { find_id: findId, marketplace: 'etsy', status: 'listed', platform_listing_id: 'SYN-E-' + stamp },
      ]
      const { error: seedErr } = await ctx.supabase
        .from('product_marketplace_data')
        .insert(seedRows)
      if (seedErr) {
        return { status: 'failed', details: { stage: 'seed_pmd', error: seedErr.message } }
      }

      // Trigger the sold transition. PATCH route fires markMarketplacesForDelist.
      const patch = await api(ctx, 'PATCH', `/api/finds/${findId}`, {
        status: 'sold',
        sold_price_gbp: SAFETY_PRICE,
        sold_at: new Date().toISOString(),
      })
      if (patch.status !== 200) {
        return { status: 'failed', details: { stage: 'patch_sold', http_status: patch.status, body: patch.body } }
      }

      // Brief wait for the auto-delist write — same race window as the
      // delist verify_pmd step. Without it the read-after-write can miss
      // under concurrent load.
      await new Promise((r) => setTimeout(r, 1500))

      // Verify both PMD rows now show needs_delist
      const { data: pmd, error: readErr } = await ctx.supabase
        .from('product_marketplace_data')
        .select('marketplace, status')
        .eq('find_id', findId)
      if (readErr) return { status: 'failed', details: { stage: 'read_pmd', error: readErr.message } }
      if (!pmd || pmd.length !== 2) {
        return { status: 'failed', details: { stage: 'read_pmd', reason: 'wrong row count', rows: pmd } }
      }
      const stillListed = pmd.filter((p) => p.status !== 'needs_delist')
      if (stillListed.length > 0) {
        return {
          status: 'failed',
          details: {
            stage: 'verify_propagation',
            reason: 'cross-marketplace delist did not propagate',
            still_listed: stillListed,
          },
        }
      }

      return { status: 'passed', details: { propagated_to: pmd.map((p) => p.marketplace) } }
    } finally {
      // Always tear down — cascade deletes the PMD rows we seeded
      try {
        await ctx.supabase.from('finds').delete().eq('id', findId).eq('user_id', ctx.userId)
      } catch { /* ignore */ }
    }
  })
}

/**
 * Step 13 — bulk delist of multiple finds via /api/crosslist/delist
 * called once per find (matches the UI's bulk-delist loop). Verifies
 * the per-find delist works in sequence and that PMD rows for all
 * targeted finds flip — catches regressions where delist works on
 * one find but a side-effect breaks the next iteration.
 */
async function stepBulkDelist(ctx: RunnerContext) {
  return runStep(ctx, 'delist.bulk', async () => {
    const stamp = Date.now().toString(36).toUpperCase()
    const findIds: string[] = []
    try {
      // Create 3 cheap test finds with seeded vinted PMD rows. Same
      // bot-spam-safe naming — these never go live on any marketplace
      // but consistency keeps the cleanup queries simple.
      for (let i = 0; i < 3; i++) {
        const created = await api(ctx, 'POST', '/api/finds', {
          name: SAFETY_TITLE,
          asking_price_gbp: SAFETY_PRICE,
          category: 'other',
          sku: SAFETY_SKU_PREFIX + 'BULK' + i + '-' + stamp,
          status: 'listed',
          description: SAFETY_DESCRIPTION,
        })
        if (created.status !== 201) {
          return { status: 'failed', details: { stage: 'create_' + i, http_status: created.status } }
        }
        const id = (created.body as { data?: { id?: string } })?.data?.id
        if (!id) return { status: 'failed', details: { stage: 'create_' + i, reason: 'no id' } }
        findIds.push(id)

        await ctx.supabase
          .from('product_marketplace_data')
          .insert({
            find_id: id,
            marketplace: 'vinted',
            status: 'listed',
            platform_listing_id: 'SYN-BULK-' + i + '-' + stamp,
          })
      }

      // Bulk delist (sequential calls, mirrors UI loop)
      const results: number[] = []
      for (const id of findIds) {
        const r = await api(ctx, 'POST', '/api/crosslist/delist', { findId: id, marketplace: 'vinted' })
        results.push(r.status)
      }
      const allOk = results.every((s) => s === 200)
      if (!allOk) {
        return { status: 'failed', details: { stage: 'delist_loop', http_statuses: results } }
      }

      // Verify all 3 PMD rows flipped
      await new Promise((r) => setTimeout(r, 800))
      const { data: pmd } = await ctx.supabase
        .from('product_marketplace_data')
        .select('find_id, status')
        .in('find_id', findIds)
        .eq('marketplace', 'vinted')
      const stillListed = (pmd ?? []).filter((p) => p.status !== 'delisted' && p.status !== 'ended')
      if (stillListed.length > 0) {
        return { status: 'failed', details: { stage: 'verify', still_listed: stillListed } }
      }

      return { status: 'passed', details: { count: findIds.length, http_statuses: results } }
    } finally {
      // Cleanup — cascade removes PMD rows
      for (const id of findIds) {
        try {
          await ctx.supabase.from('finds').delete().eq('id', id).eq('user_id', ctx.userId)
        } catch { /* ignore */ }
      }
    }
  })
}

/**
 * Step 11 — expense + mileage create/delete. Smaller scope than stash
 * CRUD because neither has a rename, but they're hot paths for the
 * tax page so they deserve a smoke check.
 */
async function stepFinanceCrud(ctx: RunnerContext) {
  return runStep(ctx, 'finance.crud', async () => {
    const today = new Date().toISOString().slice(0, 10)

    // Expense create. Description carries the SKU-prefix marker so the
    // cleanup query can find leaks even if the API delete fails.
    const exp = await api(ctx, 'POST', '/api/expenses', {
      amount_gbp: 0.01,
      category: 'packaging',
      description: SAFETY_SKU_PREFIX + 'expense ' + Date.now(),
      date: today,
    })
    if (exp.status !== 201) {
      return { status: 'failed', details: { stage: 'expense_create', http_status: exp.status, body: exp.body } }
    }
    const expId = (exp.body as { data?: { id?: string } })?.data?.id
    if (!expId) {
      return { status: 'failed', details: { stage: 'expense_create', reason: 'no id', body: exp.body } }
    }

    // Mileage create — vehicle name carries the SKU-prefix marker for cleanup.
    const mileage = await api(ctx, 'POST', '/api/mileage', {
      miles: 0.1,
      vehicle: SAFETY_SKU_PREFIX + 'vehicle',
      vehicle_type: 'car',
      purpose: 'sourcing',
      date: today,
    })
    if (mileage.status !== 201) {
      // Best-effort cleanup of the expense we did create
      await ctx.supabase.from('expenses').delete().eq('id', expId).eq('user_id', ctx.userId)
      return { status: 'failed', details: { stage: 'mileage_create', http_status: mileage.status, body: mileage.body } }
    }
    const mileageId = (mileage.body as { data?: { id?: string } })?.data?.id

    // Cleanup both via the API (tests the DELETE handlers too)
    const expDel = await api(ctx, 'DELETE', `/api/expenses/${expId}`)
    const mileageDel = mileageId
      ? await api(ctx, 'DELETE', `/api/mileage/${mileageId}`)
      : { status: 200 }

    if (expDel.status !== 200 || mileageDel.status !== 200) {
      return {
        status: 'failed',
        details: { stage: 'cleanup', expense_delete: expDel.status, mileage_delete: mileageDel.status },
      }
    }

    return { status: 'passed', details: { expense_id: expId, mileage_id: mileageId } }
  })
}

/**
 * Run the full suite. Returns the per-step results and the overall outcome.
 * Cleanup is always attempted, even after thrown errors.
 */
export async function runSuite(ctx: RunnerContext): Promise<{ steps: StepResult[]; overall: 'passed' | 'failed' }> {
  const state: SuiteState = {}
  const steps: StepResult[] = []

  // Pre-flight: clear any artefacts from a previous run that died
  // mid-flight, so the new run starts from a clean slate.
  await cleanupArtefacts(ctx)

  try {
    steps.push(await stepCreateFind(ctx, state))
    steps.push(await stepFetchFind(ctx, state))
    steps.push(await stepPublishEbay(ctx, state))
    steps.push(await stepVerifyListed(ctx, state))
    steps.push(await stepDelistEbay(ctx, state))
    steps.push(await stepVerifyDelisted(ctx, state))
    steps.push(await stepEditFind(ctx, state))
    steps.push(await stepVintedQueueRoundtrip(ctx, state))
    steps.push(await stepStashCrud(ctx))
    steps.push(await stepFinanceCrud(ctx))
    steps.push(await stepMarkSoldAutoDelist(ctx))
    steps.push(await stepBulkDelist(ctx))
    steps.push(await stepValidationGuards(ctx))
  } finally {
    // Cleanup unconditionally — even an uncaught throw must not leave
    // a £999 listing on eBay or a leaked find row.
    const cleanup = await cleanupArtefacts(ctx)
    steps.push({
      step: 'cleanup',
      status: 'passed',
      durationMs: 0,
      details: cleanup,
    })
    await ctx.supabase.from('synthetic_test_results').insert({
      run_id: ctx.runId,
      step: 'cleanup',
      status: 'passed',
      duration_ms: 0,
      details: cleanup,
    })
  }

  const overall = steps.some((s) => s.status === 'failed') ? 'failed' : 'passed'
  return { steps, overall }
}
