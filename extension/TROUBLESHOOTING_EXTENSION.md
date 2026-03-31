# Troubleshooting Extension Communication

## Issue: "Extension detected but not responding"

This means the extension marker is found, but the PING message isn't getting a response.

### Step 1: Reload the Extension

1. Open `chrome://extensions/`
2. Find "Wrenlist Skylark" extension
3. Click the **reload icon** (circular arrow) on the extension card
4. Wait for it to reload (check for any errors in red)

### Step 2: Check Background Script Console

1. In `chrome://extensions/`, find "Wrenlist Skylark"
2. Click **"Inspect views: service worker"** (or "background page")
3. This opens the background script console
4. Look for these log messages:
   - `Wrenlist Skylark: Registering onMessageExternal listener`
   - `Wrenlist Skylark: onMessageExternal listener registered`
5. If you see errors (red text), note them down

### Step 3: Test PING Manually

In the background script console, you should see logs when messages are received. Try clicking the button again and watch for:
- `Wrenlist Skylark: onMessageExternal triggered`
- `Wrenlist Skylark: Received external message from www.wrenlist.com`
- `Wrenlist Skylark: Responding to PING`

### Step 4: Check Web Page Console

1. On the Wrenlist products page, open DevTools (F12)
2. Go to Console tab
3. Click "Batch Import from Vinted" button
4. Look for:
   - `Extension ping error: ...` (if it fails)
   - `Extension ping response: ...` (if it succeeds)

### Step 5: Verify Extension ID

Make sure the extension ID matches:
- Extension ID: `jmfdldnaajligifppkjcmognhfgicoel`
- Check in `chrome://extensions/` → Details → Extension ID

### Step 6: Check Manifest

Verify the extension has:
- `externally_connectable` with `*://*.wrenlist.com/*`
- `host_permissions` includes `*://*.wrenlist.com/*`

### Common Issues

**Issue: Service worker stopped**
- Solution: Reload extension, check for errors

**Issue: Extension ID mismatch**
- Solution: Verify extension ID in `chrome://extensions/` matches the code

**Issue: CORS/Origin errors**
- Solution: Check `externally_connectable` in manifest.json

**Issue: Listener not registered**
- Solution: Check background script console for errors during initialization

### Debug Commands

In background script console:
```javascript
// Check if listener is registered
console.log('Checking listeners...');

// Manually test PING response
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  console.log('Test listener:', msg, sender);
  if (msg.type === 'PING') {
    sendResponse({ success: true, test: true });
    return true;
  }
});
```

### Still Not Working?

1. Check if extension is enabled (toggle should be ON)
2. Check for any red error messages in `chrome://extensions/`
3. Try disabling and re-enabling the extension
4. Check browser console for any security/CORS errors
5. Verify you're on `www.wrenlist.com` (not just `wrenlist.com`)

