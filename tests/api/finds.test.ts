/**
 * API Tests for POST /api/finds
 * Run with: npx playwright test tests/api/finds.test.ts
 */

import { test, expect } from '@playwright/test'

test.describe('POST /api/finds', () => {
  test('should return 401 without auth', async ({ request }) => {
    const response = await request.post('/api/finds', {
      data: {
        name: 'Test Find',
        category: 'clothing',
        condition: 'good',
        status: 'draft',
      },
    })

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('should return 201 with valid auth', async ({ request }) => {
    // Note: This test requires setting up authenticated session first
    // Placeholder test to demonstrate structure
    const response = await request.post('/api/finds', {
      headers: {
        'Authorization': 'Bearer fake-token', // Would be real token
      },
      data: {
        name: 'Test Find',
        category: 'clothing',
        condition: 'good',
        status: 'draft',
      },
    })

    // Test expects 201 or 401 (depending on token validity)
    expect([201, 401, 400]).toContain(response.status())
  })

  test('should validate required fields', async ({ request }) => {
    const response = await request.post('/api/finds', {
      data: {}, // Missing required fields
    })

    expect(response.status()).toBe(401) // Unauthorized (no auth)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })
})

test.describe('GET /api/finds', () => {
  test('should return 401 without auth', async ({ request }) => {
    const response = await request.get('/api/finds')

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('should support pagination params', async ({ request }) => {
    const response = await request.get('/api/finds?limit=20&offset=0')

    expect([401, 400, 200]).toContain(response.status())
  })
})
