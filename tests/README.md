# Wrenlist Playwright Test Suite

Comprehensive end-to-end test coverage for critical user paths in Wrenlist.

## Test Files

### `auth.spec.ts`
Authentication and authorization tests:
- Login page validation (email/password fields, validation rules)
- Register page flow
- Auth redirects and access control
- Error handling for invalid credentials

### `add-find.spec.ts`
Sourcing/inventory form tests:
- Full form submission with valid data
- Form validation (required fields, input types)
- Category and condition selection
- Marketplace selection (eBay, Vinted, Etsy, Shopify)
- Pricing and margin calculation
- SKU auto-generation and override
- Source type and date selection
- Navigation (save, cancel)

### `listing.spec.ts`
Marketplace listing management:
- Listing creation flow
- Platform-specific field display (eBay, Vinted, Etsy)
- Listing status, price, and date display
- Filtering and search
- Bulk actions
- Edit/delete operations
- Empty state handling

### `operations.spec.ts`
Expenses and mileage tracking:
- **Expenses**: Category filtering, table display, VAT calculations, totals
- **Mileage**: Vehicle management, trip logging, HMRC rate calculations (45p/mile)
- Statistics and summaries
- Tax year period display

### `dashboard.spec.ts`
Main dashboard and metrics:
- Stat cards (active finds, revenue, margin, days to sell)
- Recent inventory table
- Activity feed with timestamps
- Insights and recommendations
- "This month" statistics
- Responsive design (mobile 375px, tablet)
- Navigation CTAs

## Running Tests

### Install Dependencies
```bash
npm install -D @playwright/test
```

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx playwright test tests/auth.spec.ts
```

### Run Tests in UI Mode
```bash
npx playwright test --ui
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Tests in Headed Mode (with browser window)
```bash
npx playwright test --headed
```

### Generate HTML Report
```bash
npx playwright test
npx playwright show-report
```

## Test Configuration

Tests are configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:3000`
- **Parallel Execution**: Enabled (multiple tests run simultaneously)
- **Retries**: 2 retries in CI environment
- **Screenshots**: Captured on failure only
- **Traces**: Enabled for debugging failed tests
- **Web Server**: Automatically starts dev server on `npm run dev`

## Pre-Requisites

1. **Development server must be running** or Playwright will start it automatically:
   ```bash
   npm run dev
   ```

2. **Test database/mock data** should be available (currently uses mock data)

## Writing New Tests

### Test Structure
```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  })

  test('should do something', async ({ page }) => {
    // Test code
  })
})
```

### Common Assertions
```typescript
// Navigation
await expect(page).toHaveURL('/app/dashboard')

// Element visibility
await expect(page.locator('button')).toBeVisible()

// Input values
await expect(page.locator('input')).toHaveValue('expected')

// Text content
await expect(page.locator('h1')).toContainText('Welcome')

// Attributes
await expect(page.locator('a')).toHaveAttribute('href', '/app/inventory')
```

### Waiting Strategies
```typescript
// Wait for element
await page.locator('button').click()
await page.waitForLoadState('networkidle')

// Wait for navigation
await page.waitForNavigation()

// Wait for specific element
await page.waitForSelector('text=Success')
```

## CI/CD Integration

Tests run in CI with:
- Single worker (sequential execution for stability)
- 2 retries for flaky tests
- Screenshots on failure
- HTML report generation

Set `CI=true` environment variable to enable CI mode:
```bash
CI=true npm test
```

## Debugging Failed Tests

1. **Generate HTML Report**:
   ```bash
   npx playwright test
   npx playwright show-report
   ```

2. **Use Debug Mode**:
   ```bash
   npx playwright test --debug
   ```

3. **Check Screenshots/Traces**:
   - Screenshots: `test-results/`
   - Traces: Enable in `playwright.config.ts`

4. **Run Single Test**:
   ```bash
   npx playwright test tests/auth.spec.ts -g "should display login form"
   ```

## Test Coverage

| Feature | Coverage | File |
|---------|----------|------|
| Authentication | Login, Register, Access Control | auth.spec.ts |
| Sourcing (Add Find) | Form Submission, Validation, Calculations | add-find.spec.ts |
| Listings | Creation, Filtering, Platform-Specific Fields | listing.spec.ts |
| Expenses | Categories, Filtering, Totals, VAT | operations.spec.ts |
| Mileage | Vehicles, Trips, HMRC Rates, Calculations | operations.spec.ts |
| Dashboard | Metrics, Inventory, Activity, Responsiveness | dashboard.spec.ts |

## Known Limitations

- Tests use mock data (no real Supabase integration)
- Some features require authentication (tests assume public access for MVP)
- File upload tests are placeholders (requires mock file handling)
- Platform-specific integrations (Vinted extension, eBay API) are tested for UI presence only

## Future Improvements

- [ ] Mock Supabase for integration tests
- [ ] Visual regression testing
- [ ] Performance benchmarks
- [ ] Accessibility audit (WCAG 2.1 compliance)
- [ ] Real-world data seeding for staging tests
- [ ] Multi-user scenarios
- [ ] E-commerce platform API mocking (eBay, Vinted, Etsy)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [Assertions](https://playwright.dev/docs/assertions)
- [Web Testing Best Practices](https://playwright.dev/docs/best-practices)
