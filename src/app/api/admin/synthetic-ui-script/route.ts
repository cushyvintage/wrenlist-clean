import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { isAdmin } from '@/lib/admin'
import { UI_SUITE_JS } from '@/lib/synthetic/ui-driver'

/**
 * GET /api/admin/synthetic-ui-script
 *
 * Returns the UI synthetic suite as a string of JavaScript. The dashboard
 * "Run UI suite" button fetches this then injects it into the current
 * window via new Function(...).
 *
 * Why not just run the script in the dashboard's own bundle? Because it
 * needs to navigate to /add-find, which would unload the dashboard
 * (single-page app navigation works, but the React tree the script
 * touches lives at /add-find — running the suite from /admin/tests
 * would mean either navigating away or running against a different page).
 *
 * Practical compromise: open /add-find in a new tab, then paste the
 * script + watch window.__wlUiTest. The dashboard exposes a one-click
 * helper that does this.
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  if (!isAdmin(user.email)) {
    return ApiResponseHelper.unauthorized()
  }
  return ApiResponseHelper.success({ script: UI_SUITE_JS })
})
