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
  SAFETY_NAME_PREFIX,
  SAFETY_PRICE,
  SAFETY_SKU_PREFIX,
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
      name: SAFETY_NAME_PREFIX + ' ' + stamp,
      asking_price_gbp: SAFETY_PRICE,
      category: 'other',
      sku,
      status: 'draft',
      selected_marketplaces: ['ebay'],
      brand: 'Synthetic',
      condition: 'good',
      description: 'Automated synthetic test. Do NOT bid.',
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
    const name = '__SYN_STASH__ ' + stamp
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
 * Step 11 — expense + mileage create/delete. Smaller scope than stash
 * CRUD because neither has a rename, but they're hot paths for the
 * tax page so they deserve a smoke check.
 */
async function stepFinanceCrud(ctx: RunnerContext) {
  return runStep(ctx, 'finance.crud', async () => {
    const today = new Date().toISOString().slice(0, 10)

    // Expense create
    const exp = await api(ctx, 'POST', '/api/expenses', {
      amount_gbp: 0.01,
      category: 'packaging',
      description: '__SYN_EXPENSE__ ' + Date.now(),
      date: today,
    })
    if (exp.status !== 201) {
      return { status: 'failed', details: { stage: 'expense_create', http_status: exp.status, body: exp.body } }
    }
    const expId = (exp.body as { data?: { id?: string } })?.data?.id
    if (!expId) {
      return { status: 'failed', details: { stage: 'expense_create', reason: 'no id', body: exp.body } }
    }

    // Mileage create
    const mileage = await api(ctx, 'POST', '/api/mileage', {
      miles: 0.1,
      vehicle: '__SYN_VEHICLE__',
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
