/**
 * UI driver for synthetic tests. Renders to a self-contained string of
 * JavaScript that can be:
 *   1. Injected into the wrenlist tab via Claude-in-Chrome
 *   2. Returned from /api/admin/synthetic-ui-tests for the dashboard
 *      "Run UI suite" button to fire via fetch + window.eval
 *
 * Why a string of JS rather than a normal TS module? Because the suite
 * runs INSIDE the user's browser tab — same session, same cookies,
 * same React tree — so we exercise the actual UI code paths a user
 * would. Bundling + serving Next.js code into the browser is overkill;
 * a self-contained script that returns its results on `window` is
 * perfectly enough for our needs and matches the API-suite pattern.
 *
 * The script writes its progress + result to:
 *   window.__wlUiTest = { state: 'running' | 'done', steps: [...], runId }
 *
 * The dashboard polls window.__wlUiTest until state === 'done'.
 */

export interface UiStepResult {
  step: string
  status: 'passed' | 'failed' | 'skipped'
  details?: Record<string, unknown>
  durationMs?: number
}

/**
 * A single self-contained <script> body. No external deps, no imports.
 * Runs in the wrenlist tab's window context.
 *
 * Cleanup is run in a finally block — DELETE the find via the API as
 * the same authenticated user, so the cookie is already attached.
 */
export const UI_SUITE_JS = `
(async function wrenlistUiSuite() {
  if (window.__wlUiTest && window.__wlUiTest.state === 'running') return;
  const stamp = Date.now().toString(36).toUpperCase();
  const NAME = 'WL-SYN-UI-' + stamp + ' Vintage Glass Vase';
  const PRICE = '999';
  const steps = [];
  let createdFindId = null;

  function step(name, status, details) {
    const row = { step: name, status, details: details || {}, recordedAt: new Date().toISOString() };
    steps.push(row);
    window.__wlUiTest = { state: 'running', steps, suiteStarted: stamp };
    return row;
  }
  function setNative(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  async function waitFor(predicate, timeout, label) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      try { const v = predicate(); if (v) return v; } catch (e) {}
      await wait(150);
    }
    throw new Error('waitFor timeout: ' + label);
  }
  async function findByText(selector, regex, timeout) {
    return waitFor(() => Array.from(document.querySelectorAll(selector)).find(el => regex.test(el.textContent || '')),
      timeout || 5000, selector + ' matching ' + regex);
  }

  window.__wlUiTest = { state: 'running', steps: [], suiteStarted: stamp };

  try {
    // STEP 1 — navigate to /add-find if not there
    const t0 = Date.now();
    if (!location.pathname.startsWith('/add-find')) {
      location.href = '/add-find';
      // Page reload kills our script; abort here and ask caller to re-fire after navigation.
      step('navigate', 'skipped', { reason: 'navigation triggered, re-fire after page load' });
      window.__wlUiTest = { state: 'done', steps, suiteStarted: stamp, overall: 'failed' };
      return;
    }
    step('navigate', 'passed', { url: location.href, ms: Date.now() - t0 });

    // STEP 2 — wait for form to render (textarea[placeholder="Item title"])
    const titleEl = await waitFor(
      () => document.querySelector('textarea[placeholder="Item title"]'),
      8000, 'title textarea',
    );
    step('form_rendered', 'passed', { found: 'title_textarea' });

    // STEP 3 — fill title
    setNative(titleEl, NAME);
    if (titleEl.value !== NAME) {
      step('fill_title', 'failed', { expected: NAME, got: titleEl.value });
      throw new Error('title fill did not stick');
    }
    step('fill_title', 'passed', { chars: titleEl.value.length });

    // STEP 4 — fill description
    const descEl = document.querySelector('textarea[placeholder="Describe the item..."]');
    if (descEl) { setNative(descEl, 'Sold as seen.'); step('fill_desc', 'passed', { chars: descEl.value.length }); }
    else step('fill_desc', 'skipped', { reason: 'no description textarea' });

    // STEP 5 — fill price (first 0.00 input)
    const priceEl = document.querySelector('input[type="number"][placeholder="0.00"]');
    if (!priceEl) { step('fill_price', 'failed', { reason: 'no price input' }); throw new Error('no price input'); }
    setNative(priceEl, PRICE);
    step('fill_price', 'passed', { value: priceEl.value });

    // STEP 6 — click Save Draft
    await wait(400);
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => /save\\s*draft/i.test(b.textContent || ''));
    if (!saveBtn) { step('find_save_btn', 'failed', { reason: 'no save draft button' }); throw new Error('no save btn'); }
    if (saveBtn.disabled) { step('save_btn_state', 'failed', { reason: 'save draft disabled' }); throw new Error('save disabled'); }
    saveBtn.click();
    step('clicked_save', 'passed', {});

    // STEP 7 — wait for either redirect to /finds or for an error toast
    const result = await waitFor(() => {
      if (location.pathname === '/finds' || location.pathname.startsWith('/finds/')) return { redirected_to: location.href };
      const errEl = document.querySelector('[role="alert"], [class*="bg-red"]');
      if (errEl && errEl.textContent && errEl.textContent.length > 5 && errEl.textContent.length < 300) return { error: errEl.textContent.trim() };
      return null;
    }, 8000, 'redirect or error');

    if (result.error) {
      step('post_save', 'failed', result);
      throw new Error('save error: ' + result.error);
    }
    step('post_save', 'passed', result);

    // STEP 8 — verify the find exists via the API (uses our cookie)
    const findsList = await fetch('/api/finds?limit=20', { credentials: 'include' }).then(r => r.json());
    const items = findsList?.data?.items || findsList?.items || [];
    const created = items.find(f => f.name === NAME);
    if (!created) {
      step('verify_in_db', 'failed', { reason: 'find not in /api/finds list', recent: items.slice(0,3).map(f=>f.name) });
      throw new Error('find not in db');
    }
    createdFindId = created.id;
    step('verify_in_db', 'passed', { find_id: created.id, sku: created.sku, status: created.status });

  } catch (e) {
    step('exception', 'failed', { message: String(e && e.message || e) });
  } finally {
    // Cleanup — delete the find if we created one
    if (createdFindId) {
      try {
        const r = await fetch('/api/finds/' + createdFindId, { method: 'DELETE', credentials: 'include' });
        step('cleanup', r.ok ? 'passed' : 'failed', { http: r.status });
      } catch (e) {
        step('cleanup', 'failed', { message: String(e && e.message || e) });
      }
    } else {
      step('cleanup', 'skipped', { reason: 'no find to delete' });
    }

    const overall = steps.some(s => s.status === 'failed') ? 'failed' : 'passed';
    window.__wlUiTest = { state: 'done', steps, suiteStarted: stamp, overall };
  }
})();
true
`.trim()
