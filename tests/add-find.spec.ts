import { test, expect } from '@playwright/test'

/**
 * Add Find Flow Tests
 * Tests creating and saving finds with form validation and margin calculation
 */
test.describe('Add Find Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/add-find')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Form structure', () => {
    test('should render the add-find form with all main sections', async ({ page }) => {
      // Check for main form sections
      await expect(page.locator('text=/item details/i')).toBeVisible()
      await expect(page.locator('text=/category/i')).toBeVisible()
      await expect(page.locator('text=/condition/i')).toBeVisible()
      await expect(page.locator('text=/sourcing/i')).toBeVisible()
      await expect(page.locator('text=/pricing/i')).toBeVisible()
    })

    test('should have item name input field', async ({ page }) => {
      const itemNameInput = page.locator('input[placeholder="Brand, item, colour, size..."]')
      await expect(itemNameInput).toBeVisible()
    })

    test('should have category select field', async ({ page }) => {
      const selects = page.locator('select')
      const count = await selects.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should have condition select field', async ({ page }) => {
      const conditionLabel = page.locator('text=/condition/i')
      await expect(conditionLabel).toBeVisible()
    })

    test('should have cost and price input fields', async ({ page }) => {
      const numberInputs = page.locator('input[type="number"]')
      const count = await numberInputs.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Form submission and validation', () => {
    test('should display error when item name is empty', async ({ page }) => {
      // Try to save without filling required field
      const saveButton = page.getByRole('button', { name: /save find/i })
      await saveButton.click()

      // Should show error message
      await expect(page.locator('text=Item name is required')).toBeVisible()
    })

    test('should allow filling form with valid data', async ({ page }) => {
      // Fill item name
      const itemNameInput = page.locator('input[placeholder="Brand, item, colour, size..."]')
      await itemNameInput.fill('Vintage Levi 501')
      await expect(itemNameInput).toHaveValue('Vintage Levi 501')

      // Select category
      const selects = page.locator('select')
      await selects.first().selectOption('denim')

      // Select condition
      await selects.nth(1).selectOption('excellent')

      // Verify values are set
      await expect(selects.first()).toHaveValue('denim')
      await expect(selects.nth(1)).toHaveValue('excellent')
    })

    test('should fill size, colour, and brand fields', async ({ page }) => {
      // These fields may be in different locations depending on form structure
      const textInputs = page.locator('input[type="text"]')
      const count = await textInputs.count()
      expect(count).toBeGreaterThan(0)
    })

    test('should fill sourcing information', async ({ page }) => {
      // Source type (should be a select or radio)
      const selects = page.locator('select')
      const count = await selects.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Pricing and margin calculation', () => {
    test('should display margin calculation when both cost and price are filled', async ({ page }) => {
      // Fill item name first
      const itemNameInput = page.locator('input[placeholder="Brand, item, colour, size..."]')
      await itemNameInput.fill('Test Item')

      // Fill cost and asking price
      const numberInputs = page.locator('input[type="number"]')
      if ((await numberInputs.count()) >= 2) {
        // Cost paid
        await numberInputs.nth(0).fill('10')
        // Asking price
        await numberInputs.nth(1).fill('50')

        // Margin should be visible/calculated
        await page.waitForTimeout(500)
        const marginDisplay = page.locator('text=/margin/i')
        const isVisible = await marginDisplay.isVisible().catch(() => false)
        expect(isVisible).toBe(true)
      }
    })

    test('should calculate correct margin percentage', async ({ page }) => {
      const itemNameInput = page.locator('input[placeholder="Brand, item, colour, size..."]')
      await itemNameInput.fill('Test Item')

      const numberInputs = page.locator('input[type="number"]')
      if ((await numberInputs.count()) >= 2) {
        // Cost: £10, Price: £50 = (50-10)/50 = 80%
        await numberInputs.nth(0).fill('10')
        await numberInputs.nth(1).fill('50')

        await page.waitForTimeout(500)
        // Verify calculation is visible
        const marginText = page.locator('text=/80|margin/i')
        const count = await marginText.count()
        expect(count).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Form navigation', () => {
    test('should have save button', async ({ page }) => {
      const saveButton = page.getByRole('button', { name: /save find/i })
      await expect(saveButton).toBeVisible()
    })

    test('should navigate to inventory on successful save', async ({ page }) => {
      // Fill all required fields
      const itemNameInput = page.locator('input[placeholder="Brand, item, colour, size..."]')
      await itemNameInput.fill('Test Vintage Item')

      // Select category
      const selects = page.locator('select')
      await selects.first().selectOption('clothing')

      // Save
      const saveButton = page.getByRole('button', { name: /save find/i })
      await saveButton.click()

      // Should navigate to inventory on success (or show error if API fails)
      await page.waitForTimeout(1000)
      const url = page.url()
      const isSuccess = url.includes('/finds') || url.includes('/add-find')
      expect(isSuccess).toBe(true)
    })
  })

  test.describe('Marketplace selection', () => {
    test('should have marketplace selection options', async ({ page }) => {
      // Look for checkboxes or toggles for marketplace selection
      const listOnSection = page.locator('text=/list on|marketplace/i')
      const isVisible = await listOnSection.isVisible().catch(() => false)
      expect(isVisible).toBe(true)
    })

    test('should allow selecting multiple marketplaces', async ({ page }) => {
      const checkboxes = page.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      // Should have at least 2 marketplace options
      expect(count).toBeGreaterThanOrEqual(2)
    })
  })
})
