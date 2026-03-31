# Testing Guide - Wrenlist Skylark Extension

## 🧪 Testing Checklist

### 1. Basic Import Functionality

#### Test Single Import
- [ ] Navigate to a Vinted product page
- [ ] Verify "Import to Wrenlist" button appears
- [ ] Click button and verify loading state
- [ ] Check that product is imported to Wrenlist
- [ ] Verify redirect to product edit page (if enabled)
- [ ] Check import history in popup

#### Test All Marketplaces
- [ ] Vinted (UK, US, CA, NL, FR, DE, ES, IT, PL, LT, BE, CZ)
- [ ] eBay (US, UK, CA, AU, IE)
- [ ] Depop
- [ ] Poshmark (US, CA, AU)
- [ ] Mercari
- [ ] Grailed
- [ ] Facebook Marketplace
- [ ] Etsy

### 2. Bulk Import

#### Test Bulk Selection
- [ ] Navigate to a marketplace listings/search page
- [ ] Verify checkboxes appear on product cards
- [ ] Select multiple products (3-5)
- [ ] Verify bulk action bar appears
- [ ] Check that count updates correctly

#### Test Bulk Import Process
- [ ] Click "Import Selected"
- [ ] Verify progress bar appears
- [ ] Check that progress updates correctly
- [ ] Verify 1-second delay between imports
- [ ] Check success/failure summary
- [ ] Verify all imports appear in history

### 3. Authentication

#### Test Auth Check
- [ ] Log out of Wrenlist
- [ ] Try to import a product
- [ ] Verify login page opens automatically
- [ ] Log in and try again
- [ ] Verify import succeeds

#### Test Auth Errors
- [ ] Simulate 401 error (if possible)
- [ ] Verify error message is user-friendly
- [ ] Check that login redirect works

### 4. Error Handling

#### Test Retry Logic
- [ ] Simulate network error (disable network)
- [ ] Try to import
- [ ] Re-enable network
- [ ] Verify retry attempts (check console)
- [ ] Verify exponential backoff (1s, 2s, 4s)

#### Test Error Messages
- [ ] Test 401 error (should show login prompt)
- [ ] Test 429 error (should show rate limit message)
- [ ] Test 500 error (should retry automatically)
- [ ] Test network error (should retry)

### 5. Rate Limiting

#### Test Rate Limit
- [ ] Import 10+ products rapidly
- [ ] Verify requests are throttled
- [ ] Check console for rate limit messages
- [ ] Verify 500ms delay between requests
- [ ] Verify automatic queuing when limit reached

### 6. Publishing Features

#### Test Publish to Marketplace
```javascript
// In browser console on Wrenlist product page
chrome.runtime.sendMessage({
  type: 'PUBLISH_TO_MARKETPLACE',
  marketplace: 'vinted',
  productData: {
    title: 'Test Product',
    description: 'Test Description',
    price: 25.99,
    condition: 'good',
    images: ['https://example.com/image.jpg'],
    brand: 'Test Brand'
  }
}, (response) => {
  console.log('Publish result:', response);
});
```

#### Test Update Listing
```javascript
chrome.runtime.sendMessage({
  type: 'UPDATE_MARKETPLACE_LISTING',
  marketplace: 'vinted',
  listingId: '123456',
  productData: {
    title: 'Updated Title',
    price: 29.99
  }
}, (response) => {
  console.log('Update result:', response);
});
```

#### Test Delist
```javascript
chrome.runtime.sendMessage({
  type: 'DELIST_FROM_MARKETPLACE',
  marketplace: 'vinted',
  listingId: '123456'
}, (response) => {
  console.log('Delist result:', response);
});
```

### 7. Settings

#### Test Settings Page
- [ ] Open options page
- [ ] Toggle "Auto-open Wrenlist"
- [ ] Toggle "Show notifications"
- [ ] Change success message duration
- [ ] Enable/disable marketplaces
- [ ] Save settings
- [ ] Verify settings persist after reload

#### Test Settings Sync
- [ ] Change settings in one browser
- [ ] Check if settings sync (if using sync storage)
- [ ] Verify settings apply immediately

### 8. Import History

#### Test History Tracking
- [ ] Import multiple products
- [ ] Check popup for import history
- [ ] Verify success rate calculation
- [ ] Check recent imports list (last 10)
- [ ] Verify timestamps are correct

#### Test History Export
- [ ] Click "Export History (CSV)"
- [ ] Verify CSV file downloads
- [ ] Check CSV contains all expected columns
- [ ] Verify data is correct

#### Test History Clear
- [ ] Click "Clear All History"
- [ ] Confirm action
- [ ] Verify history is cleared
- [ ] Check that stats reset

### 9. UI/UX

#### Test Button Appearance
- [ ] Verify button styling matches Wrenlist brand
- [ ] Check button positioning on all marketplaces
- [ ] Verify hover effects work
- [ ] Check button doesn't break page layout

#### Test Loading States
- [ ] Verify "⏳ Importing..." state
- [ ] Check "✓ Imported!" success state
- [ ] Verify "✗ Failed" error state
- [ ] Check auto-reset after success message

#### Test Notifications
- [ ] Enable notifications in settings
- [ ] Import a product
- [ ] Verify browser notification appears
- [ ] Disable notifications
- [ ] Verify no notification appears

### 10. Edge Cases

#### Test Duplicate Prevention
- [ ] Import same product twice
- [ ] Verify button doesn't duplicate
- [ ] Check that second import still works

#### Test SPA Navigation
- [ ] Test on Facebook Marketplace (SPA)
- [ ] Navigate between pages
- [ ] Verify button reinjects correctly
- [ ] Check URL change detection

#### Test Multiple Tabs
- [ ] Open multiple marketplace tabs
- [ ] Import from different tabs
- [ ] Verify all imports tracked correctly
- [ ] Check history shows all imports

## 🐛 Common Issues & Solutions

### Button Not Appearing
1. Check if marketplace is enabled in settings
2. Refresh the page
3. Check browser console for errors
4. Verify you're on a product page (not search/listings)

### Import Fails
1. Check if logged into Wrenlist
2. Verify internet connection
3. Check browser console for error messages
4. Try refreshing and importing again

### Rate Limit Errors
1. Wait 1 minute before trying again
2. Reduce bulk import size
3. Check rate limiter settings in code

### Authentication Errors
1. Log out and log back into Wrenlist
2. Clear browser cookies
3. Try importing again

## 📊 Performance Testing

### Load Testing
- [ ] Import 50+ products in bulk
- [ ] Monitor memory usage
- [ ] Check for memory leaks
- [ ] Verify extension doesn't slow down browser

### Stress Testing
- [ ] Rapidly click import button multiple times
- [ ] Import from multiple tabs simultaneously
- [ ] Test with slow network connection
- [ ] Test with network interruptions

## ✅ Acceptance Criteria

All features are considered complete when:
- ✅ All 8 marketplaces support import
- ✅ Bulk import works on listings pages
- ✅ Publishing features work for Vinted, eBay, Depop
- ✅ Error handling retries automatically
- ✅ Rate limiting prevents bans
- ✅ Authentication checks work correctly
- ✅ Settings persist and sync
- ✅ History tracks all imports
- ✅ UI is responsive and user-friendly
- ✅ No console errors in normal operation

## 🚀 Production Readiness

Before deploying to production:
- [ ] All tests pass
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] User documentation is complete
- [ ] Error messages are user-friendly
- [ ] Settings work correctly
- [ ] History export works
- [ ] All marketplaces tested

