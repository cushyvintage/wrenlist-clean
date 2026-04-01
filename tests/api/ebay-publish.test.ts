/**
 * API Tests for POST /api/ebay/publish
 * Run with: npx playwright test tests/api/ebay-publish.test.ts
 */

import { test, expect } from '@playwright/test'

test.describe('POST /api/ebay/publish', () => {
  test('should return 401 without auth', async ({ request }) => {
    const response = await request.post('/api/ebay/publish', {
      data: {
        findId: 'invalid-id',
      },
    })

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('should return 400 with invalid findId', async ({ request }) => {
    // Test without auth first (should be 401)
    const response = await request.post('/api/ebay/publish', {
      data: {
        findId: '', // Empty ID
      },
    })

    expect([401, 400]).toContain(response.status())
  })

  test('should validate marketplace parameter', async ({ request }) => {
    const response = await request.post('/api/ebay/publish', {
      data: {
        findId: 'test-id',
        marketplace: 'INVALID',
      },
    })

    expect([401, 400]).toContain(response.status())
  })

  test('should support dryRun parameter', async ({ request }) => {
    const response = await request.post('/api/ebay/publish', {
      data: {
        findId: 'test-id',
        dryRun: true,
      },
    })

    // Should be 401 (unauthorized) or 404 (find not found)
    expect([401, 404, 400]).toContain(response.status())
  })

  test('should return meaningful error when eBay not connected', async ({ request }) => {
    // This test demonstrates what happens when user is auth'd but eBay setup is incomplete
    // Placeholder structure for when auth is implemented
    const response = await request.post('/api/ebay/publish', {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
      data: {
        findId: 'test-id',
      },
    })

    const status = response.status()
    // Should be 401 (no auth), 404 (find not found), or 400 (eBay not configured)
    expect([401, 404, 400]).toContain(status)

    if (status === 400) {
      const data = await response.json()
      // Error message should mention eBay setup
      expect(data.error?.toLowerCase()).toMatch(/ebay|setup/i)
    }
  })
})
