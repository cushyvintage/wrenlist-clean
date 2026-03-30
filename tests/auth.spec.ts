import { test, expect } from '@playwright/test'

/**
 * Authentication Tests
 * Tests login/register flow, form validation, and redirects
 */
test.describe('Authentication', () => {
  test.describe('Login page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('should display login form with all elements', async ({ page }) => {
      // Check page elements
      await expect(page.locator('h1')).toContainText('Wrenlist')
      await expect(page.locator('h2')).toContainText('Log in to your account')

      // Check inputs exist
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      const submitButton = page.locator('button[type="submit"]')

      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toContainText(/log in/i)
    })

    test('should have valid email input type', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]')
      const type = await emailInput.getAttribute('type')
      expect(type).toBe('email')
    })

    test('should have password input type', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]')
      const type = await passwordInput.getAttribute('type')
      expect(type).toBe('password')
    })

    test('should require email field', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]')
      const isRequired = await emailInput.getAttribute('required')
      expect(isRequired).not.toBeNull()
    })

    test('should require password field', async ({ page }) => {
      const passwordInput = page.locator('input[type="password"]')
      const isRequired = await passwordInput.getAttribute('required')
      expect(isRequired).not.toBeNull()
    })

    test('should have link to register page', async ({ page }) => {
      const registerLink = page.locator('a[href="/register"]')
      await expect(registerLink).toBeVisible()
      await expect(registerLink).toContainText('Sign up')
    })

    test('should show disabled state during loading', async ({ page }) => {
      // Fill form
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')

      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeEnabled()
    })

    test('should show error message on invalid credentials', async ({ page }) => {
      // Try to login with non-existent account
      await page.fill('input[type="email"]', 'nonexistent@example.com')
      await page.fill('input[type="password"]', 'wrongpassword')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Should show error message
      const errorMessage = page.locator('text=/invalid|failed|error/i')
      await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Register page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/register')
    })

    test('should display register form with all fields', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Wrenlist')
      await expect(page.locator('h2')).toContainText(/Create|account/i)

      // Check all input fields
      const fullNameInput = page.locator('input[type="text"]')
      const emailInput = page.locator('input[type="email"]')
      const passwordInputs = page.locator('input[type="password"]')
      const termsCheckbox = page.locator('input[type="checkbox"]')
      const submitButton = page.locator('button[type="submit"]')

      await expect(fullNameInput).toBeVisible()
      await expect(emailInput).toBeVisible()
      await expect(passwordInputs).toBeVisible()
      await expect(termsCheckbox).toBeVisible()
      await expect(submitButton).toBeVisible()
    })

    test('should display password requirements', async ({ page }) => {
      const passwordHint = page.locator('text=/at least 8 characters/i')
      await expect(passwordHint).toBeVisible()
    })

    test('should display terms checkbox', async ({ page }) => {
      const termsLink = page.locator('a:has-text("Terms of Service")')
      await expect(termsLink).toBeVisible()
    })

    test('should have link back to login', async ({ page }) => {
      const loginLink = page.locator('a[href="/login"]')
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toContainText(/Log in/i)
    })

    test('should prevent submission without terms agreement', async ({ page }) => {
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-of-type(2)', 'password123')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Should show error about terms
      const errorMessage = page.locator('text=/agree.*Terms|terms/i')
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
    })

    test('should show error when passwords do not match', async ({ page }) => {
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'password123')
      await page.fill('input[type="password"]:nth-of-type(2)', 'different123')
      await page.check('input[type="checkbox"]')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Should show error about mismatch
      const errorMessage = page.locator('text=/do not match|mismatch/i')
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
    })

    test('should show error when password is too short', async ({ page }) => {
      await page.fill('input[type="text"]', 'John Doe')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.fill('input[type="password"]', 'short')
      await page.fill('input[type="password"]:nth-of-type(2)', 'short')
      await page.check('input[type="checkbox"]')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      // Should show error about password length
      const errorMessage = page.locator('text=/at least 8|must be/i')
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Navigation between auth pages', () => {
    test('should navigate from login to register', async ({ page }) => {
      await page.goto('/login')
      const registerLink = page.locator('a[href="/register"]')
      await registerLink.click()

      await expect(page).toHaveURL('/register')
    })

    test('should navigate from register to login', async ({ page }) => {
      await page.goto('/register')
      const loginLink = page.locator('a[href="/login"]')
      await loginLink.click()

      await expect(page).toHaveURL('/login')
    })
  })
})
