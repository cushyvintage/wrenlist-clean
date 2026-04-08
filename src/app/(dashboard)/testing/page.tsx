'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api-utils'
import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { TestRunCard } from '@/components/testing/TestRunCard'
import { TestResultRow } from '@/components/testing/TestResultRow'
import type { TestRun, TestRunWithResults, TestResult, TestPhase } from '@/types'

// ============================================================================
// E2E TEST MATRIX — pre-populated when creating a new run
// ============================================================================

const TEST_MATRIX: Array<{ test_name: string; phase: TestPhase; expected: string }> = [
  // ========================================================================
  // AUTH
  // ========================================================================
  { test_name: 'A.1 Register — new account with email', phase: 'auth', expected: 'Account created, verify-email page shown, confirmation email sent' },
  { test_name: 'A.2 Register — Google OAuth', phase: 'auth', expected: 'Google consent screen → redirect → dashboard or onboarding' },
  { test_name: 'A.3 Login — existing email/password', phase: 'auth', expected: 'Redirects to /dashboard, session cookie set' },
  { test_name: 'A.4 Login — wrong password', phase: 'auth', expected: 'Error message shown, no redirect' },
  { test_name: 'A.5 Forgot password → reset flow', phase: 'auth', expected: 'Email sent, reset link works, password updated, can login' },
  { test_name: 'A.6 Logout', phase: 'auth', expected: 'Session cleared, redirected to /login' },
  { test_name: 'A.7 Protected routes — unauthenticated redirect', phase: 'auth', expected: '/dashboard, /finds, /add-find etc redirect to /login when logged out' },

  // ========================================================================
  // ONBOARDING
  // ========================================================================
  { test_name: 'O.1 New user → onboarding redirect', phase: 'onboarding', expected: 'First login redirects to /onboarding, not /dashboard' },
  { test_name: 'O.2 Step 1 — connect platform cards', phase: 'onboarding', expected: 'Vinted + eBay cards shown, both link to /platform-connect' },
  { test_name: 'O.3 Step 1 — skip works', phase: 'onboarding', expected: 'Skip → step 2 without error' },
  { test_name: 'O.4 Step 2 — create find / import options', phase: 'onboarding', expected: 'Create New Find + Import Listings cards shown with correct links' },
  { test_name: 'O.5 Step 3 — display name saves', phase: 'onboarding', expected: 'Display name saved to profile, redirect to /dashboard' },
  { test_name: 'O.6 Skip all steps', phase: 'onboarding', expected: 'Can skip all 3 steps, lands on dashboard with empty state' },
  { test_name: 'O.7 Return user — no re-onboarding', phase: 'onboarding', expected: 'User with onboarding_complete=true goes straight to /dashboard' },

  // ========================================================================
  // DASHBOARD
  // ========================================================================
  { test_name: 'D.1 Dashboard — empty state (new user)', phase: 'dashboard', expected: 'Helpful empty state with CTAs to add find, connect platform' },
  { test_name: 'D.2 Dashboard — with data', phase: 'dashboard', expected: 'Stats cards show real data, recent finds list populated' },
  { test_name: 'D.3 Sidebar navigation — all links work', phase: 'dashboard', expected: 'Every sidebar link navigates to correct page without 404' },
  { test_name: 'D.4 Sidebar — active state highlights', phase: 'dashboard', expected: 'Current page highlighted in sidebar' },
  { test_name: 'D.5 Topbar — user menu / logout', phase: 'dashboard', expected: 'User menu shows email, logout works' },

  // ========================================================================
  // ADD-FIND FORM (draft saves)
  // ========================================================================
  { test_name: '1.1 Vinted draft — colour, material, size save', phase: 'draft', expected: 'platform_fields.shared.colour = "Blue", vinted.primaryColor = 12, vintedSizeId = "209", vinted.material = [1,8,3]' },
  { test_name: '1.2 eBay draft — title limit 80, accept offers, condition desc', phase: 'draft', expected: 'Title shows 0/80, acceptOffers toggle saves, condition description field visible' },
  { test_name: '1.3 Etsy draft — whoMade, whenMade, tags', phase: 'draft', expected: 'whoMade = "someone_else", whenMade = "1970s", tags = "vintage, retro"' },
  { test_name: '1.4 Depop draft — source, age, style tags', phase: 'draft', expected: 'depopSource = "vintage,preloved", depopAge = "70s", depopStyleTags = "Retro,Boho"' },
  { test_name: '1.5 All 5 platforms — full field coverage', phase: 'draft', expected: 'Title 0/80, desc 0/1000, all marketplace fields visible, full platform_fields JSON saved' },

  // ========================================================================
  // ADD-FIND FORM (edge cases)
  // ========================================================================
  { test_name: '2.1 No photo — save draft without photo', phase: 'edge-case', expected: 'Draft saves successfully without photo' },
  { test_name: '2.2 No category — marketplace fields hidden', phase: 'edge-case', expected: 'Marketplace fields section does not render without category' },
  { test_name: '2.3 Switch category — size picker updates', phase: 'edge-case', expected: 'Clothing → letter sizes, switch to shoes → UK shoe sizes' },
  { test_name: '2.4 Brand typeahead — Burberry + free text', phase: 'edge-case', expected: '"Burb" → "Burberry" dropdown. "CustomBrand123" accepted as free text' },
  { test_name: '2.5 Description over limit — truncation warning', phase: 'edge-case', expected: 'Depop 1500 chars → amber "1500/1000 — will be truncated"' },
  { test_name: '2.6 AI auto-fill — photo → banner', phase: 'edge-case', expected: 'Upload photo → identification banner with title + desc + category + condition + price' },
  { test_name: '2.7 Platform switching — field persistence', phase: 'edge-case', expected: 'Add Vinted → fill colour → add eBay → colour populated → remove eBay → Vinted intact' },
  { test_name: '2.8 Size picker type switch — value clears', phase: 'edge-case', expected: 'Letter M → switch to UK number → value clears → pick UK 12' },
  { test_name: '2.9 Material deselect — chip removal', phase: 'edge-case', expected: 'Select 3 materials → deselect one → 2 chips shown' },
  { test_name: '2.10 Template apply — new fields populate', phase: 'edge-case', expected: 'Saved template populates all fields including new marketplace-specific ones' },

  // ========================================================================
  // FINDS CRUD
  // ========================================================================
  { test_name: 'F.1 Finds list — loads with items', phase: 'finds-crud', expected: 'Grid/list of finds shown, photos render, status badges correct' },
  { test_name: 'F.2 Finds list — empty state', phase: 'finds-crud', expected: 'Helpful empty state with CTA to add first find' },
  { test_name: 'F.3 Finds list — search/filter', phase: 'finds-crud', expected: 'Search by title, filter by status/category works' },
  { test_name: 'F.4 Find detail — /finds/[id] loads', phase: 'finds-crud', expected: 'All fields render: photos, title, desc, price, category, marketplace fields' },
  { test_name: 'F.5 Find detail — edit and save', phase: 'finds-crud', expected: 'Change title, save → reloads with updated title' },
  { test_name: 'F.6 Find detail — marketplace fields restore', phase: 'finds-crud', expected: 'Colour picker, size, material chips all restore from saved data' },
  { test_name: 'F.7 Find detail — delete', phase: 'finds-crud', expected: 'Delete with confirmation, removed from list' },
  { test_name: 'F.8 Find detail — photo management', phase: 'finds-crud', expected: 'Reorder, delete, add photos. Primary photo indicator works' },

  // ========================================================================
  // PLATFORM CONNECT
  // ========================================================================
  { test_name: 'PC.1 Platform connect page loads', phase: 'platform-connect', expected: 'All 10 platforms shown with connect/status indicators' },
  { test_name: 'PC.2 eBay OAuth flow', phase: 'platform-connect', expected: 'Authorize → callback → connected status, username shown' },
  { test_name: 'PC.3 Vinted cookie connect', phase: 'platform-connect', expected: 'Extension detects Vinted session, shows username' },
  { test_name: 'PC.4 Connected status persists', phase: 'platform-connect', expected: 'Refresh page → connected platforms still shown' },
  { test_name: 'PC.5 Disconnect platform', phase: 'platform-connect', expected: 'Disconnect eBay → status reverts to not connected' },
  { test_name: 'PC.6 Extension not installed warning', phase: 'platform-connect', expected: 'Shows install extension prompt for platforms that need it' },

  // ========================================================================
  // PUBLISH
  // ========================================================================
  { test_name: '3.1 Vinted publish — colour/size/material IDs', phase: 'publish', expected: 'Extension sends correct colorId, sizeId, materialIds. Listing has correct swatch + label' },
  { test_name: '3.2 eBay publish — colour text, brand, aspects', phase: 'publish', expected: 'Colour text, brand, category item specifics sent correctly' },
  { test_name: '3.3 Etsy publish — tags, whoMade, whenMade', phase: 'publish', expected: 'Tags filled, who made = "Another company", when made dropdown set' },
  { test_name: '3.4 Depop publish — colour slug, style tags', phase: 'publish', expected: 'Colour slug matches, style tags appear on listing' },

  // ========================================================================
  // DATA FLOW
  // ========================================================================
  { test_name: '4.1 DB verification — platform_fields shape', phase: 'data-flow', expected: 'platform_fields JSON matches expected structure after save' },
  { test_name: '4.2 Extension Product object — dynamic properties', phase: 'data-flow', expected: 'color, tags, whenMade, styleTags, colorIds, MaterialVinted, whoMade, Source, age present' },
  { test_name: '4.3 Size value — numeric Vinted ID not text', phase: 'data-flow', expected: 'size[0] is numeric string like "209", not "M"' },
  { test_name: '4.4 Edit reload — fields restore on /finds/[id]', phase: 'data-flow', expected: 'Reopen saved draft → colour picker shows Blue, materials show chips, sizes restore' },

  // ========================================================================
  // LISTINGS
  // ========================================================================
  { test_name: 'L.1 Listings page — shows active listings', phase: 'listings', expected: 'All listed items shown grouped by platform, status correct' },
  { test_name: 'L.2 Listings — empty state', phase: 'listings', expected: 'Helpful empty state for no listings' },
  { test_name: 'L.3 Delist action', phase: 'listings', expected: 'Delist button → status changes to delisted, listing removed from marketplace' },

  // ========================================================================
  // SOLD + CUSTOMERS
  // ========================================================================
  { test_name: 'S.1 Mark item as sold', phase: 'sold-customers', expected: 'Record sale: buyer, price, date, platform → item status = sold' },
  { test_name: 'S.2 Sold list — shows sold items', phase: 'sold-customers', expected: 'All sold items listed with P&L (cost, sale price, profit)' },
  { test_name: 'S.3 Sold detail — /sold/[id]', phase: 'sold-customers', expected: 'Full P&L breakdown, buyer info, platform fees, postage' },
  { test_name: 'S.4 Customers list', phase: 'sold-customers', expected: 'Buyer CRM shows all customers, order count, total spend' },
  { test_name: 'S.5 Customer detail — /customers/[id]', phase: 'sold-customers', expected: 'Customer profile with order history, lifetime value, P&L per order' },

  // ========================================================================
  // EXPENSES + MILEAGE
  // ========================================================================
  { test_name: 'E.1 Add expense', phase: 'expenses-mileage', expected: 'Create expense with category, amount, date, receipt. Saves to DB' },
  { test_name: 'E.2 Expense list — filter by category/date', phase: 'expenses-mileage', expected: 'Filters work, totals update' },
  { test_name: 'E.3 Edit/delete expense', phase: 'expenses-mileage', expected: 'Edit amount, delete with confirmation' },
  { test_name: 'E.4 Add mileage trip', phase: 'expenses-mileage', expected: 'Record trip with miles, date, purpose. HMRC rate applied' },
  { test_name: 'E.5 Mileage list + totals', phase: 'expenses-mileage', expected: 'Trips listed, HMRC allowance calculated' },

  // ========================================================================
  // SOURCING
  // ========================================================================
  { test_name: 'SC.1 Create sourcing trip', phase: 'sourcing', expected: 'New trip with location, date, type, budget. Shows in list' },
  { test_name: 'SC.2 Sourcing trip detail', phase: 'sourcing', expected: '/sourcing/[id] shows trip details, linked finds, spend vs budget' },
  { test_name: 'SC.3 Suppliers list + detail', phase: 'sourcing', expected: 'Supplier CRUD works, linked trips shown' },

  // ========================================================================
  // ANALYTICS
  // ========================================================================
  { test_name: 'AN.1 Analytics page loads', phase: 'analytics', expected: 'Summary stats render, charts load without errors' },
  { test_name: 'AN.2 Analytics — empty state', phase: 'analytics', expected: 'Graceful empty state with no data, not broken charts' },
  { test_name: 'AN.3 Analytics — by category/marketplace', phase: 'analytics', expected: 'Breakdown charts render with correct data' },

  // ========================================================================
  // SETTINGS + BILLING
  // ========================================================================
  { test_name: 'ST.1 Settings page loads', phase: 'settings-billing', expected: 'Profile info, preferences visible' },
  { test_name: 'ST.2 Update display name', phase: 'settings-billing', expected: 'Change name → saves → persists on reload' },
  { test_name: 'ST.3 Billing page — free plan', phase: 'settings-billing', expected: 'Shows current plan (free), upgrade options' },
  { test_name: 'ST.4 Stripe checkout flow', phase: 'settings-billing', expected: 'Upgrade button → Stripe checkout page (do not complete)' },

  // ========================================================================
  // MARKETING PAGES
  // ========================================================================
  { test_name: 'M.1 Landing page', phase: 'marketing', expected: 'Hero, features, CTAs render. Login/register links work' },
  { test_name: 'M.2 Pricing page', phase: 'marketing', expected: 'Plan comparison table, CTA buttons link to register' },
  { test_name: 'M.3 About / Story / Blog', phase: 'marketing', expected: 'Pages render without errors, navigation works' },
  { test_name: 'M.4 Privacy / Terms', phase: 'marketing', expected: 'Legal pages render, content present' },

  // ========================================================================
  // UX AUDIT
  // ========================================================================
  { test_name: 'UX.1 Empty states — all pages', phase: 'ux-audit', expected: 'Every page with data has a helpful empty state (not blank white)' },
  { test_name: 'UX.2 Loading skeletons — all pages', phase: 'ux-audit', expected: 'Loading states show skeletons/spinners, not FOUC' },
  { test_name: 'UX.3 Error handling — API failures', phase: 'ux-audit', expected: 'Error messages shown for failed API calls, not silent failures' },
  { test_name: 'UX.4 Mobile responsive — sidebar collapse', phase: 'ux-audit', expected: 'Sidebar collapses on mobile, hamburger menu works' },
  { test_name: 'UX.5 Mobile responsive — add-find form', phase: 'ux-audit', expected: 'Form usable on mobile, no horizontal scroll, buttons reachable' },
  { test_name: 'UX.6 Mobile responsive — finds list', phase: 'ux-audit', expected: 'Grid adapts, cards readable on small screens' },
  { test_name: 'UX.7 Navigation consistency', phase: 'ux-audit', expected: 'Back buttons, breadcrumbs work. No dead ends' },
  { test_name: 'UX.8 Form validation — required fields', phase: 'ux-audit', expected: 'Missing required fields show inline errors, not silent save' },
  { test_name: 'UX.9 Button states — loading/disabled', phase: 'ux-audit', expected: 'Submit buttons disable during save, show loading state' },
  { test_name: 'UX.10 Onboarding flow coherence', phase: 'ux-audit', expected: 'Steps make sense, progression feels natural, no confusion about what to do next' },
]

// ============================================================================
// PAGE
// ============================================================================

export default function TestingPage() {
  const [runs, setRuns] = useState<TestRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<TestRunWithResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Load all runs
  const loadRuns = useCallback(async () => {
    try {
      const data = await fetchApi<TestRun[]>('/api/testing')
      setRuns(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Load a specific run with results
  const loadRun = useCallback(async (id: string) => {
    try {
      const data = await fetchApi<TestRunWithResults>(`/api/testing/${id}`)
      setSelectedRun(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  useEffect(() => {
    if (selectedRunId) loadRun(selectedRunId)
  }, [selectedRunId, loadRun])

  // Create new run with pre-populated test matrix
  const createRun = async () => {
    setCreating(true)
    try {
      const run = await fetchApi<TestRun>('/api/testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Beta Readiness — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          results: TEST_MATRIX,
        }),
      })
      await loadRuns()
      setSelectedRunId(run.id)
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  // Delete a run
  const deleteRun = async (id: string) => {
    await fetchApi(`/api/testing/${id}`, { method: 'DELETE' })
    if (selectedRunId === id) {
      setSelectedRunId(null)
      setSelectedRun(null)
    }
    loadRuns()
  }

  // Update a single test result (inline)
  const updateResult = async (resultId: string, fields: Partial<TestResult>) => {
    if (!selectedRunId) return

    // Optimistic update
    setSelectedRun((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        results: prev.results.map((r) =>
          r.id === resultId ? { ...r, ...fields } : r
        ),
      }
    })

    try {
      await fetchApi(`/api/testing/${selectedRunId}/results`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId, ...fields }),
      })
      // Reload to get updated run counts
      loadRun(selectedRunId)
      loadRuns()
    } catch {
      // Revert on error
      loadRun(selectedRunId)
    }
  }

  // Compute top-level stats
  const latestRun = runs[0]
  const totalRuns = runs.length
  const latestPassRate = latestRun && latestRun.total_tests > 0
    ? Math.round((latestRun.passed_count / latestRun.total_tests) * 100)
    : 0
  const totalBugs = runs.reduce(
    (sum, r) => sum + r.failed_count,
    0
  )

  // Group results by phase
  const groupedResults = selectedRun?.results.reduce<Record<string, TestResult[]>>(
    (acc, r) => {
      const key = r.phase
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    },
    {}
  )

  const phaseOrder: TestPhase[] = [
    'auth', 'onboarding', 'dashboard',
    'draft', 'edge-case', 'finds-crud', 'platform-connect',
    'publish', 'data-flow',
    'listings', 'sold-customers', 'expenses-mileage', 'sourcing',
    'analytics', 'settings-billing', 'marketing',
    'ux-audit',
  ]
  const phaseLabels: Record<TestPhase, string> = {
    auth: 'Auth Flow',
    onboarding: 'Onboarding',
    dashboard: 'Dashboard',
    draft: 'Add-Find — Draft Saves',
    'edge-case': 'Add-Find — Edge Cases',
    'finds-crud': 'Finds CRUD',
    'platform-connect': 'Platform Connect',
    publish: 'Publish to Marketplace',
    'data-flow': 'Data Flow Verification',
    listings: 'Listings Management',
    'sold-customers': 'Sold + Customers',
    'expenses-mileage': 'Expenses + Mileage',
    sourcing: 'Sourcing + Suppliers',
    analytics: 'Analytics',
    'settings-billing': 'Settings + Billing',
    marketing: 'Marketing Pages',
    'ux-audit': 'UX Audit',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-medium text-ink">Test Tracker</h1>
          <p className="text-xs text-ink-lt mt-1">Beta readiness — full E2E testing across all pages and flows</p>
        </div>
        <button
          onClick={createRun}
          disabled={creating}
          className="text-xs font-medium bg-sage text-white px-4 py-2 rounded hover:bg-sage-dk transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'New Test Run'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="total runs" value={totalRuns} />
        <StatCard label="latest pass rate" value={latestPassRate} suffix="%" />
        <StatCard label="total failures" value={totalBugs} />
        <StatCard
          label="last run"
          value={
            latestRun
              ? new Date(latestRun.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '—'
          }
        />
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* Left: run list */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-sage-dim font-medium">
            Test Runs
          </div>
          {loading ? (
            <div className="text-xs text-ink-lt py-8 text-center">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="text-xs text-ink-lt py-8 text-center">
              No test runs yet. Click &ldquo;New Test Run&rdquo; to start.
            </div>
          ) : (
            runs.map((run) => (
              <TestRunCard
                key={run.id}
                run={run}
                isSelected={selectedRunId === run.id}
                onClick={() => setSelectedRunId(run.id)}
                onDelete={() => deleteRun(run.id)}
              />
            ))
          )}
        </div>

        {/* Right: selected run detail */}
        <div>
          {!selectedRun ? (
            <div className="text-xs text-ink-lt py-16 text-center">
              Select a test run to view results
            </div>
          ) : (
            <div className="space-y-4">
              {/* Run header */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-ink">{selectedRun.name}</div>
                <div className="text-[10px] text-ink-lt">
                  {selectedRun.passed_count}/{selectedRun.total_tests} passed
                </div>
              </div>

              {/* Results grouped by phase */}
              {phaseOrder.map((phase) => {
                const results = groupedResults?.[phase]
                if (!results || results.length === 0) return null

                const passed = results.filter((r) => r.status === 'passed').length
                const total = results.length

                return (
                  <Panel
                    key={phase}
                    title={`${phaseLabels[phase]} (${passed}/${total})`}
                    className="p-0"
                  >
                    {results.map((result) => (
                      <TestResultRow
                        key={result.id}
                        result={result}
                        onUpdate={updateResult}
                      />
                    ))}
                  </Panel>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
