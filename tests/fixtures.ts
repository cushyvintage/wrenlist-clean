/**
 * Playwright Test Fixtures
 * Provides authenticated users and test data setup
 */

import { test as base, expect } from '@playwright/test'

/**
 * Extended test context with auth utilities
 */
export const test = base.extend({
  /**
   * Authenticate as a test user before each test
   */
  authenticatedPage: async ({ page }, use) => {
    // For now, just provide the page as-is
    // In a real scenario, you would:
    // 1. Navigate to login
    // 2. Fill credentials
    // 3. Wait for redirect to dashboard
    // 4. Extract auth token
    // 5. Set it in browser storage or headers

    await use(page)
  },
})

export { expect }
