import { test, expect } from '@playwright/test'

test.describe('Add Find Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to add-find page
    await page.goto('http://localhost:3000/app/add-find')
  })

  test('should render the add-find form with all sections', async ({ page }) => {
    // Check page title
    const title = page.locator('text=item details').first()
    await expect(title).toBeVisible()

    // Check all sections are present
    await expect(page.locator('text=item name')).toBeVisible()
    await expect(page.locator('text=category')).toBeVisible()
    await expect(page.locator('text=condition')).toBeVisible()
    await expect(page.locator('text=sourcing')).toBeVisible()
    await expect(page.locator('text=pricing')).toBeVisible()
    await expect(page.locator('text=list on')).toBeVisible()
  })

  test('should fill form with valid data and calculate margin', async ({ page }) => {
    // Fill item name
    await page.fill('input[placeholder="Brand, item, colour, size..."]', 'Vintage Levi 501')

    // Select category
    await page.selectOption('select', 'denim')

    // Select condition
    await page.locator('select').nth(1).selectOption('excellent')

    // Fill size
    await page.fill('input[placeholder="M, 32, 10..."]', '32x30')

    // Fill colour
    await page.fill('input[placeholder="Brown..."]', 'indigo')

    // Fill brand
    await page.fill('input[placeholder="Brand..."]', "Levi's")

    // Fill source type
    await page.locator('select').nth(2).selectOption('charity_shop')

    // Fill source name
    await page.fill('input[placeholder="Shop name or location..."]', 'Oxfam Manchester')

    // Fill cost paid
    await page.fill('input[placeholder="0.00"]', '5.00')

    // Fill asking price
    const askingPriceInputs = page.locator('input[type="number"][step="0.01"]')
    await askingPriceInputs.nth(2).fill('75.00')

    // Verify margin is calculated
    await expect(page.locator('text=margin').first()).toBeVisible()
  })

  test('should display error when item name is empty', async ({ page }) => {
    // Try to save without filling required field
    const saveButton = page.locator('button:has-text("save find")')
    await saveButton.click()

    // Should show error message
    await expect(page.locator('text=Item name is required')).toBeVisible()
  })

  test('should cancel and return to inventory', async ({ page }) => {
    // Click cancel button
    const cancelButton = page.locator('button:has-text("cancel")')
    await cancelButton.click()

    // Should navigate to inventory page
    await expect(page).toHaveURL('http://localhost:3000/app/inventory')
  })
})
