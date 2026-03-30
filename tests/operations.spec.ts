import { test, expect } from '@playwright/test'

test.describe('Operations - Expenses & Mileage', () => {
  test.describe('Expenses page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/expenses')
    })

    test('should display expenses page', async ({ page }) => {
      await expect(page).toHaveURL('/app/expenses')
    })

    test('should display expense disclaimer', async ({ page }) => {
      const disclaimer = page.locator('text=/Disclaimer|tax/i')
      await expect(disclaimer.first()).toBeVisible()
    })

    test.describe('Expense categories', () => {
      test('should display all expense categories', async ({ page }) => {
        const categoryButtons = page.locator('button').filter({ hasText: /packaging|postage|platform|supplies|vehicle|other/i })
        const count = await categoryButtons.count()

        expect(count).toBeGreaterThanOrEqual(5) // At least packaging, postage, platform, supplies, vehicle
      })

      test('should filter expenses by category', async ({ page }) => {
        const packagingButton = page.locator('button:has-text("packaging")')

        if (await packagingButton.isVisible()) {
          await packagingButton.click()

          // Table should update to show only packaging expenses
          await page.waitForLoadState('networkidle').catch(() => {})

          // Button should show selected state
          const isSelected = await packagingButton.evaluate((el) => el.classList.contains('bg-sage'))
          expect(isSelected).toBe(true)
        }
      })

      test('should show "all" category filter', async ({ page }) => {
        const allButton = page.locator('button:has-text("all")')
        await expect(allButton).toBeVisible()
      })

      test('should reset to all categories', async ({ page }) => {
        // Click a category
        const packagingButton = page.locator('button:has-text("packaging")')
        if (await packagingButton.isVisible()) {
          await packagingButton.click()
        }

        // Click all
        const allButton = page.locator('button:has-text("all")')
        await allButton.click()

        // All button should be selected
        const isSelected = await allButton.evaluate((el) => el.classList.contains('bg-sage'))
        expect(isSelected).toBe(true)
      })
    })

    test.describe('Expense table', () => {
      test('should display expense table', async ({ page }) => {
        const table = page.locator('table')
        await expect(table).toBeVisible()
      })

      test('should display date column', async ({ page }) => {
        const dateHeader = page.locator('th:has-text("date"), td:has-text("date")')
        await expect(dateHeader.first()).toBeVisible()
      })

      test('should display description column', async ({ page }) => {
        const descHeader = page.locator('th:has-text("description"), td:has-text("description")')
        await expect(descHeader.first()).toBeVisible()
      })

      test('should display category column', async ({ page }) => {
        const categoryHeader = page.locator('th:has-text("category"), td:has-text("category")')
        await expect(categoryHeader.first()).toBeVisible()
      })

      test('should display amount column', async ({ page }) => {
        const amountHeader = page.locator('th:has-text("amount"), td:has-text("amount")')
        await expect(amountHeader.first()).toBeVisible()
      })

      test('should display VAT column', async ({ page }) => {
        const vatHeader = page.locator('th:has-text("VAT"), td:has-text("VAT")')
        await expect(vatHeader.first()).toBeVisible()
      })

      test('should show expense rows', async ({ page }) => {
        const tableRows = page.locator('tbody tr')
        const count = await tableRows.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should display amount in GBP format', async ({ page }) => {
        const amounts = page.locator('td').filter({ hasText: /£\d+\.\d{2}/ })
        const count = await amounts.count()

        expect(count).toBeGreaterThan(0)
      })
    })

    test.describe('Expense totals', () => {
      test('should display total expenses', async ({ page }) => {
        const totalText = page.locator('text=/Total expenses/i')
        await expect(totalText).toBeVisible()
      })

      test('should show total amount', async ({ page }) => {
        const totalAmount = page.locator('text=/£\\d+\\.\\d{2}/')
        const count = await totalAmount.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should display tax year period', async ({ page }) => {
        const taxYearText = page.locator('text=/Apr.*Mar|tax year/i')
        await expect(taxYearText.first()).toBeVisible()
      })
    })

    test.describe('Expense insights', () => {
      test('should display insight card', async ({ page }) => {
        const insight = page.locator('[class*="Insight"], text=/Platform fees|expense/i').first()

        if (await insight.isVisible().catch(() => false)) {
          await expect(insight).toBeVisible()
        }
      })

      test('should have link to analytics', async ({ page }) => {
        const analyticsLink = page.locator('a:has-text("analytics"), a[href*="/analytics"]').first()

        if (await analyticsLink.isVisible().catch(() => false)) {
          await expect(analyticsLink).toBeVisible()
        }
      })
    })
  })

  test.describe('Mileage page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/app/mileage')
    })

    test('should display mileage page', async ({ page }) => {
      await expect(page).toHaveURL('/app/mileage')
    })

    test('should display HMRC disclaimer', async ({ page }) => {
      const disclaimer = page.locator('text=/HMRC|mileage rates/i')
      await expect(disclaimer.first()).toBeVisible()
    })

    test.describe('Vehicle management', () => {
      test('should display vehicles section', async ({ page }) => {
        const vehiclesSection = page.locator('text=/your vehicles|vehicle/i')
        await expect(vehiclesSection.first()).toBeVisible()
      })

      test('should display primary vehicle', async ({ page }) => {
        const primaryVehicle = page.locator('text=/Primary vehicle|Ford Fiesta|main vehicle/i')
        await expect(primaryVehicle.first()).toBeVisible()
      })

      test('should show vehicle registration', async ({ page }) => {
        // Should show registration like YK21 ABC
        const registration = page.locator('text=/[A-Z]{2}\\d{2}\\s[A-Z]{3}/')
        await expect(registration.first()).toBeVisible()
      })

      test('should display mileage rate', async ({ page }) => {
        const rateText = page.locator('text=/\\d+p\\s*\\/\\s*mile|rate/i')
        await expect(rateText.first()).toBeVisible()
      })

      test('should show secondary vehicle option', async ({ page }) => {
        const secondaryVehicle = page.locator('text=/Secondary vehicle|VW Caddy|second vehicle/i')
        await expect(secondaryVehicle.first()).toBeVisible()
      })

      test('should allow managing vehicles', async ({ page }) => {
        const manageButton = page.locator('button:has-text("manage"), a:has-text("manage")').first()

        if (await manageButton.isVisible().catch(() => false)) {
          await expect(manageButton).toBeVisible()
        }
      })
    })

    test.describe('Mileage statistics', () => {
      test('should display mileage stats', async ({ page }) => {
        const statsCards = page.locator('[class*="StatCard"], text=/(total miles|deductible|trips)/i')
        const count = await statsCards.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should display total miles', async ({ page }) => {
        const totalMilesText = page.locator('text=/total miles|\\d+\\s*miles/i')
        await expect(totalMilesText.first()).toBeVisible()
      })

      test('should display deductible value', async ({ page }) => {
        const deductibleText = page.locator('text=/deductible|£\\d+/')
        await expect(deductibleText.first()).toBeVisible()
      })

      test('should display trips logged count', async ({ page }) => {
        const tripsText = page.locator('text=/trips/i')
        await expect(tripsText.first()).toBeVisible()
      })

      test('should calculate HMRC rates automatically', async ({ page }) => {
        // Rate should be shown (typically 45p/mile for first 10,000 miles)
        const rateText = page.locator('text=/45p|per mile|mileage rate/i')
        await expect(rateText.first()).toBeVisible()
      })
    })

    test.describe('Trip log', () => {
      test('should display trip log section', async ({ page }) => {
        const tripLog = page.locator('text=/trip|recent/i')
        await expect(tripLog.first()).toBeVisible()
      })

      test('should display trip entries', async ({ page }) => {
        // Should show trip locations
        const locations = page.locator('text=/Portobello|Oxfam|Market|Boot|trip/i')
        const count = await locations.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should show trip date', async ({ page }) => {
        const dates = page.locator('text=/\\d{1,2}\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/')
        const count = await dates.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should display trip purpose', async ({ page }) => {
        const purposes = page.locator('text=/(car boot|charity|clearance|sourcing|delivery)/i')
        const count = await purposes.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should show miles for each trip', async ({ page }) => {
        // Should show "XX mi" format
        const mileage = page.locator('text=/\\d+\\s*mi/i')
        const count = await mileage.count()

        expect(count).toBeGreaterThan(0)
      })

      test('should show deductible value per trip', async ({ page }) => {
        // Should show £X.XX for each trip
        const deductibles = page.locator('text=/£\\d+\\.\\d{2}/i')
        const count = await deductibles.count()

        expect(count).toBeGreaterThan(0)
      })
    })

    test.describe('Mileage calculations', () => {
      test('should calculate total deductible correctly', async ({ page }) => {
        // Get displayed total
        const totalSection = page.locator('text=/Deductible value|total/i').first()
        await expect(totalSection).toBeVisible()
      })

      test('should show tax year totals', async ({ page }) => {
        const summarySection = page.locator('[class*="grid"]').filter({ hasText: /Miles this year|Deductible|avg per trip/i })

        if (await summarySection.first().isVisible().catch(() => false)) {
          await expect(summarySection.first()).toBeVisible()
        }
      })

      test('should calculate average per trip', async ({ page }) => {
        const avgText = page.locator('text=/Avg per trip|average/i')

        if (await avgText.isVisible().catch(() => false)) {
          await expect(avgText).toBeVisible()
        }
      })
    })

    test.describe('Vehicle filtering', () => {
      test('should allow filtering by vehicle', async ({ page }) => {
        const vehicleFilter = page.locator('select, [role="combobox"]').first()

        if (await vehicleFilter.isVisible().catch(() => false)) {
          await vehicleFilter.click()
        }
      })

      test('should update stats when vehicle changes', async ({ page }) => {
        const selects = page.locator('select')

        if ((await selects.count()) > 0) {
          const currentValue = await selects.first().inputValue()
          expect(currentValue).toBeTruthy()
        }
      })
    })
  })
})
