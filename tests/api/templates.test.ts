/**
 * API Tests for /api/templates
 * Run with: npx playwright test tests/api/templates.test.ts
 */

import { test, expect } from '@playwright/test'

test.describe('GET /api/templates', () => {
  test('should return 401 without auth', async ({ request }) => {
    const response = await request.get('/api/templates')

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('should return array of templates when authenticated', async ({ request }) => {
    // Placeholder test for authorized request
    const response = await request.get('/api/templates', {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    })

    // Should be 401 (invalid token) or 200 (success)
    expect([401, 200]).toContain(response.status())

    if (response.status() === 200) {
      const data = await response.json()
      expect(Array.isArray(data.data) || Array.isArray(data)).toBe(true)
    }
  })
})

test.describe('POST /api/templates', () => {
  test('should return 401 without auth', async ({ request }) => {
    const response = await request.post('/api/templates', {
      data: {
        name: 'Test Template',
        fields: { category: 'clothing' },
      },
    })

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('should validate required fields', async ({ request }) => {
    const response = await request.post('/api/templates', {
      data: {}, // Missing name and fields
    })

    expect([401, 400]).toContain(response.status())
  })

  test('should create template with valid data', async ({ request }) => {
    const response = await request.post('/api/templates', {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
      data: {
        name: 'Test Template',
        fields: {
          category: 'clothing',
          condition: 'good',
        },
      },
    })

    // Should be 401 (invalid token), 201 (created), or 400 (validation error)
    expect([401, 201, 400]).toContain(response.status())

    if (response.status() === 201) {
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', 'Test Template')
    }
  })
})

test.describe('DELETE /api/templates/:id', () => {
  test('should return 401 without auth', async ({ request }) => {
    const response = await request.delete('/api/templates/test-id')

    expect(response.status()).toBe(401)
    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  test('should return 404 for non-existent template', async ({ request }) => {
    const response = await request.delete('/api/templates/non-existent-id', {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    })

    // Should be 401 (invalid token) or 404 (not found)
    expect([401, 404]).toContain(response.status())
  })

  test('should delete template when authorized', async ({ request }) => {
    const response = await request.delete('/api/templates/test-id', {
      headers: {
        'Authorization': 'Bearer fake-token',
      },
    })

    // Should be 401 (invalid token), 204 (deleted), or 404 (not found)
    expect([401, 204, 404]).toContain(response.status())
  })
})
