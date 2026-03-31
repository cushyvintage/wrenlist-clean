# Troubleshooting Guide - Wrenlist Skylark

## Issue: Page Opens But Shows Login Screen

### Symptoms
- Import succeeds (product is created)
- Extension opens product page
- Page shows login screen instead of product

### Cause
The extension's API calls use authentication tokens/headers, but the browser's web session (cookies) might be separate or expired. When opening a new tab, it doesn't have access to the web session cookies.

### Solution

**Option 1: Log in to Wrenlist in your browser**
1. Open a new tab
2. Go to https://www.wrenlist.com
3. Log in if needed
4. Try importing again

**Option 2: Use existing Wrenlist tab**
1. If you already have Wrenlist open in another tab
2. The session should be available
3. Try importing - it should work

**Option 3: Disable auto-open**
1. Go to extension settings (right-click extension icon → Options)
2. Uncheck "Auto-open Wrenlist after import"
3. Manually navigate to the product after import

### Technical Details

The extension uses:
- API authentication: Works (import succeeds)
- Web session cookies: May not be available in new tabs

This is a browser security feature - extensions can't automatically share session cookies with new tabs.

### Future Enhancement

We could add:
- Check if user is logged in before opening tab
- Open login page first if needed
- Redirect to product after login

