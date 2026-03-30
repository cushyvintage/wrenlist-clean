# Playwright Tests for Wrenlist

This directory contains comprehensive Playwright E2E tests for the Wrenlist application.

## Running Tests

### Prerequisites
- Node.js 18+ installed
- Application running on `http://localhost:3000`
- `npm install` dependencies completed

### Run All Tests
```bash
npm run test
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npx playwright test tests/auth.spec.ts
```

### Run Tests with Filter
```bash
npx playwright test --grep "should display login form"
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Generate Test Report
```bash
npm run test
npx playwright show-report
```

## Test Structure

### Authentication Tests (`auth.spec.ts`)
- Login page form elements and validation
- Register page form elements and validation
- Password validation and error handling
- Terms of Service agreement requirement
- Navigation between auth pages
- Invalid credential handling

**Key Points:**
- Tests HTML5 form validation
- Tests error message display
- Does NOT test actual Supabase auth (would require test credentials)
- Tests UI behavior and user flows

### Add Find Tests (`add-find.spec.ts`)
- Form structure and all input fields
- Item name validation (required field)
- Form submission with valid data
- Margin calculation
- Marketplace selection
- Sourcing information
- Pricing fields

**Key Points:**
- Tests form rendering and field availability
- Tests margin calculation logic
- Tests form submission flow
- Tests navigation after save

### Listing Tests (`listing.spec.ts`)
- Listings page display
- Listing table or list rendering
- Marketplace selection
- Platform-specific fields (eBay, Vinted)
- Listing details (status, price, date)
- Filtering and search
- Bulk actions
- Empty state handling

**Key Points:**
- Tests data display
- Tests filter functionality
- Tests responsive layout
- Handles empty listings gracefully

### Operations Tests (`operations.spec.ts`)
- Expenses page structure and categories
- Expense table columns and data
- Expense filtering
- Mileage page structure
- Vehicle management
- Mileage statistics
- Trip logging
- HMRC rate calculation

**Key Points:**
- Tests expense category filtering
- Tests mileage calculations
- Tests data display in tables
- Tests responsive layout

### Dashboard Tests (`dashboard.spec.ts`)
- Dashboard page loads without errors
- Stat cards and metrics display
- Inventory section
- Recent activity display
- CTA buttons and navigation
- Responsive design (mobile, tablet)
- Data loading and display

**Key Points:**
- Tests responsive layout at different breakpoints
- Tests data display with mock data
- Tests navigation links
- Tests metric calculations

## Selector Strategy

### Using Data Attributes (Recommended)
```typescript
// Add data-testid to component in source code
<button data-testid="save-button">Save</button>

// Use in tests
await page.locator('[data-testid="save-button"]').click()
```

### Using Visible Text
```typescript
// When text is unique and won't change
await page.locator('button:has-text("Save")').click()
```

### Using Placeholders
```typescript
// For input fields
await page.locator('input[placeholder="Item name"]').fill('value')
```

### Using Semantic Selectors
```typescript
// Use role-based selectors for accessibility
await page.locator('button[role="button"]:has-text("Save")').click()
await page.locator('input[type="email"]').fill('test@example.com')
```

## Best Practices

### 1. Waits and Timing
```typescript
// Always wait for content to be ready
await page.goto('/app/dashboard')
await page.waitForLoadState('networkidle')

// Use proper wait conditions
await expect(page.locator('text=Success')).toBeVisible({ timeout: 5000 })
```

### 2. Error Handling
```typescript
// Use .catch() for optional elements
const optional = await page.locator('optional-element').isVisible().catch(() => false)
expect(optional).toBe(true)
```

### 3. Form Filling
```typescript
// Fill inputs safely
const input = page.locator('input[type="email"]')
await input.fill('test@example.com')
await expect(input).toHaveValue('test@example.com')
```

### 4. Navigation
```typescript
// Wait for navigation to complete
await page.goto('/app/dashboard')
await expect(page).toHaveURL('/app/dashboard')
```

### 5. Assertions
```typescript
// Use clear, specific assertions
await expect(element).toBeVisible()
await expect(button).toBeEnabled()
await expect(input).toHaveValue('expected')
await expect(page).toHaveURL('/expected-url')
```

## Mocking vs Real Integration

### Current Approach
Tests use **real page navigation** and **form interactions** but do NOT:
- Require authentication with real credentials
- Modify database state
- Depend on external APIs
- Use stubbed responses

### Testing Protected Pages
Protected pages (like `/app/dashboard`) load with mock data and don't require login because:
- The app uses mock data for demo purposes
- Client-side routing allows direct navigation
- No auth middleware blocks the pages

## Debugging

### Screenshots
Playwright automatically captures screenshots on failure:
```bash
# View in HTML report
npx playwright show-report
```

### Debug Mode
```bash
# Run single test with debugger
npx playwright test tests/auth.spec.ts --debug
```

## Common Issues

### Issue: "Target page, context or browser has been closed"
**Solution:** Ensure `page.goto()` completes before interacting with page

### Issue: "No element matches selector"
**Solution:** Add `waitForLoadState()` or use `isVisible().catch()` for optional elements

### Issue: Tests pass locally but fail in CI
**Solution:** Add explicit waits for network idle and ensure selectors are stable

### Issue: Flaky tests (pass sometimes, fail others)
**Solution:**
- Add explicit waits instead of `wait(1000)`
- Use `waitForLoadState('networkidle')`
- Avoid timing-dependent assertions

## Adding New Tests

### Template
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/page-path')
    await page.waitForLoadState('networkidle')
  })

  test('should describe expected behavior', async ({ page }) => {
    // Arrange - set up test state
    const element = page.locator('selector')

    // Act - perform user action
    await element.click()

    // Assert - verify result
    await expect(element).toHaveProperty('expected')
  })
})
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/locators)
- [Assertions](https://playwright.dev/docs/test-assertions)
