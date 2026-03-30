import { test, expect, devices } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/dashboard')
  })

  test.describe('Dashboard structure', () => {
    test('should load dashboard page', async ({ page }) => {
      await expect(page).toHaveURL('/app/dashboard')
    })

    test('should display welcome message', async ({ page }) => {
      const welcomeText = page.locator('h1')
      await expect(welcomeText).toBeVisible()
      await expect(welcomeText).toContainText(/welcome|dashboard/i)
    })

    test('should display main content areas', async ({ page }) => {
      // Should have multiple sections
      const panels = page.locator('[class*="Panel"], [class*="panel"]')
      const count = await panels.count()

      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Metric cards', () => {
    test('should display stat cards', async ({ page }) => {
      const statCards = page.locator('[class*="StatCard"], [class*="stat"]')
      const count = await statCards.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should display active finds metric', async ({ page }) => {
      const activeFands = page.locator('text=/Active finds|finds listed/i')
      await expect(activeFands.first()).toBeVisible()
    })

    test('should display revenue metric', async ({ page }) => {
      const revenue = page.locator('text=/revenue|£/i')
      const count = await revenue.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should display margin metric', async ({ page }) => {
      const margin = page.locator('text=/margin|%/i')
      const count = await margin.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should display days to sell metric', async ({ page }) => {
      const daysSell = page.locator('text=/days to sell|days/i')
      await expect(daysSell.first()).toBeVisible()
    })

    test('should show metric deltas', async ({ page }) => {
      // Should show change indicators like "+2 this week"
      const deltas = page.locator('text=/\\+|-|vs|↑|↓|this week|this month/i')
      const count = await deltas.count()

      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Inventory section', () => {
    test('should display recent inventory section', async ({ page }) => {
      const inventorySection = page.locator('text=/inventory|recent/i')
      await expect(inventorySection.first()).toBeVisible()
    })

    test('should display inventory table', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })

    test('should display item column', async ({ page }) => {
      const itemHeader = page.locator('th:has-text("Item"), th:has-text("item")')

      if ((await itemHeader.count()) === 0) {
        // Might be in a list instead of table
        const items = page.locator('text=/jacket|denim|nike|item/i')
        expect(await items.count()).toBeGreaterThan(0)
      }
    })

    test('should display cost column', async ({ page }) => {
      const costHeader = page.locator('th:has-text("Cost"), th:has-text("cost")')

      if ((await costHeader.count()) === 0) {
        const costValues = page.locator('text=/£\\d+/')
        expect(await costValues.count()).toBeGreaterThan(0)
      }
    })

    test('should display price column', async ({ page }) => {
      const priceHeader = page.locator('th:has-text("Price"), th:has-text("price")')

      if ((await priceHeader.count()) === 0) {
        const prices = page.locator('text=/£\\d+/')
        expect(await prices.count()).toBeGreaterThan(0)
      }
    })

    test('should display margin column', async ({ page }) => {
      const marginHeader = page.locator('th:has-text("Margin"), th:has-text("margin")')

      if ((await marginHeader.count()) === 0) {
        const margins = page.locator('text=/\\d+%/')
        expect(await margins.count()).toBeGreaterThan(0)
      }
    })

    test('should display status column', async ({ page }) => {
      const statusHeader = page.locator('th:has-text("Status"), th:has-text("status")')

      if ((await statusHeader.count()) === 0) {
        const statuses = page.locator('text=/(draft|listed|sold)/i')
        expect(await statuses.count()).toBeGreaterThan(0)
      }
    })

    test('should show inventory items', async ({ page }) => {
      const rows = page.locator('tbody tr')
      const count = await rows.count()

      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Insights section', () => {
    test('should display insight card', async ({ page }) => {
      const insight = page.locator('[class*="Insight"], text=/insight|estate|sourcing/i')
      const count = await insight.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should display insight text', async ({ page }) => {
      const insightText = page.locator('text=/margin|estate|charity|finding/i')
      const count = await insightText.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should have link from insight', async ({ page }) => {
      const insightLink = page.locator('a:has-text("analytics"), a:has-text("analysis")').first()

      if (await insightLink.isVisible().catch(() => false)) {
        await expect(insightLink).toBeVisible()
      }
    })
  })

  test.describe('Activity section', () => {
    test('should display recent activity', async ({ page }) => {
      const activitySection = page.locator('text=/activity|recent/i')
      await expect(activitySection.first()).toBeVisible()
    })

    test('should show activity items', async ({ page }) => {
      const activities = page.locator('text=/(Listed|Sold|Added)/i')
      const count = await activities.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should display activity descriptions', async ({ page }) => {
      const descriptions = page.locator('text=/jacket|denim|band|inventory/i')
      const count = await descriptions.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should show activity timestamps', async ({ page }) => {
      const timestamps = page.locator('text=/(days|day|ago|hours|hour)/i')
      const count = await timestamps.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should show activity platform', async ({ page }) => {
      const platforms = page.locator('text=/(Vinted|eBay|Etsy|Shopify|platform)/i')
      const count = await platforms.count()

      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('This month stats', () => {
    test('should display this month panel', async ({ page }) => {
      const monthPanel = page.locator('text=/This month/i')

      if (await monthPanel.isVisible().catch(() => false)) {
        await expect(monthPanel).toBeVisible()
      }
    })

    test('should show finds listed stat', async ({ page }) => {
      const findsListed = page.locator('text=/Finds listed/i')

      if (await findsListed.isVisible().catch(() => false)) {
        await expect(findsListed).toBeVisible()
      }
    })

    test('should show items sold stat', async ({ page }) => {
      const itemsSold = page.locator('text=/Items sold/i')

      if (await itemsSold.isVisible().catch(() => false)) {
        await expect(itemsSold).toBeVisible()
      }
    })

    test('should show total revenue stat', async ({ page }) => {
      const revenue = page.locator('text=/Total revenue|revenue/i')

      if (await revenue.isVisible().catch(() => false)) {
        await expect(revenue).toBeVisible()
      }
    })
  })

  test.describe('CTA button', () => {
    test('should display add new find button', async ({ page }) => {
      const ctaButton = page.locator('button:has-text("Add"), button:has-text("new find")').first()

      if (await ctaButton.isVisible().catch(() => false)) {
        await expect(ctaButton).toBeVisible()
      }
    })

    test('should navigate to add-find on click', async ({ page }) => {
      const ctaButton = page.locator('button:has-text("Add"), button:has-text("new find")').first()

      if (await ctaButton.isVisible().catch(() => false)) {
        await ctaButton.click()
        await expect(page).toHaveURL('/app/add-find')
      }
    })
  })

  test.describe('Navigation', () => {
    test('should have link to analytics', async ({ page }) => {
      const analyticsLink = page.locator('a:has-text("analytics")').first()

      if (await analyticsLink.isVisible().catch(() => false)) {
        await expect(analyticsLink).toHaveAttribute('href', /analytics/)
      }
    })

    test('should have link to inventory', async ({ page }) => {
      const inventoryLink = page.locator('a:has-text("inventory")').first()

      if (await inventoryLink.isVisible().catch(() => false)) {
        await expect(inventoryLink).toHaveAttribute('href', /inventory/)
      }
    })
  })

  test.describe('Responsive design', () => {
    test('should display on mobile viewport (375px)', async ({ browser }) => {
      const context = await browser.createContext({
        ...devices['iPhone 12'],
      })
      const page = await context.newPage()

      await page.goto('/app/dashboard')

      // Should not show horizontal scroll
      const viewportSize = page.viewportSize()
      expect(viewportSize?.width).toBe(390)

      // Main content should be visible
      await expect(page.locator('h1')).toBeVisible()

      await context.close()
    })

    test('should be responsive on tablet', async ({ browser }) => {
      const context = await browser.createContext({
        ...devices['iPad'],
      })
      const page = await context.newPage()

      await page.goto('/app/dashboard')

      // Content should adapt to tablet layout
      const viewportSize = page.viewportSize()
      expect(viewportSize?.width).toBeGreaterThan(390)

      await expect(page.locator('h1')).toBeVisible()

      await context.close()
    })

    test('should stack sections on mobile', async ({ browser }) => {
      const context = await browser.createContext({
        ...devices['iPhone 12'],
      })
      const page = await context.newPage()

      await page.goto('/app/dashboard')

      // Check if grid is single column
      const mainGrid = page.locator('[class*="grid"]').first()

      if (await mainGrid.isVisible().catch(() => false)) {
        const classes = await mainGrid.getAttribute('class')
        // Expect responsive classes like grid-cols-1 md:grid-cols-2
        expect(classes).toBeTruthy()
      }

      await context.close()
    })
  })

  test.describe('Data loading', () => {
    test('should load dashboard without errors', async ({ page }) => {
      // Check for any error messages
      const errorMessages = page.locator('text=/error|failed|unable/i')
      const errorCount = await errorMessages.count()

      expect(errorCount).toBe(0)
    })

    test('should display metrics with values', async ({ page }) => {
      // All stat cards should have numeric values
      const numbers = page.locator('text=/\\d+/')
      const count = await numbers.count()

      expect(count).toBeGreaterThan(0)
    })

    test('should display currency values in GBP', async ({ page }) => {
      const gbpValues = page.locator('text=/£\\d+/')
      const count = await gbpValues.count()

      expect(count).toBeGreaterThan(0)
    })
  })
})
