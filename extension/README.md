# Wrenlist Skylark Chrome Extension

Multi-marketplace integration extension for Wrenlist. Import products from 8+ marketplaces directly into your Wrenlist inventory with a single click.

## 🚀 Features

### Supported Marketplaces
- ✅ **Vinted** - UK, US, CA, NL, FR, DE, ES, IT, PL, LT, BE, CZ
- ✅ **eBay** - US, UK, CA, AU, IE
- ✅ **Depop** - Global
- ✅ **Poshmark** - US, CA, AU
- ✅ **Mercari** - US
- ✅ **Grailed** - Global
- ✅ **Facebook Marketplace** - Global
- ✅ **Etsy** - Global

### Core Features
- **One-Click Import** - Import products directly from marketplace product pages
- **Bulk Import** - Select and import multiple products from listings pages
- **Publish to Marketplaces** - Publish products FROM Wrenlist TO marketplaces (bidirectional sync)
- **Update & Delist** - Update existing listings or remove them from marketplaces
- **Smart Data Extraction** - Automatically extracts title, description, price, images, brand, and more
- **Import History** - Track all your imports with success rate statistics
- **Customizable Settings** - Enable/disable marketplaces, configure notifications, and more
- **Browser Notifications** - Get notified when imports complete
- **Auto-Open Wrenlist** - Automatically opens the imported product in Wrenlist (configurable)
- **Export History** - Export your import history as CSV
- **Advanced Error Handling** - Automatic retry with exponential backoff
- **Rate Limiting** - Smart throttling to prevent marketplace bans
- **Authentication Checks** - Verifies Wrenlist login before import

## 📦 Installation

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `wrenlist-skylark-extension` folder
6. The extension is now installed!

### Updating

1. Make sure you have the latest code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Wrenlist Skylark extension card

## 🎯 Usage

### Basic Import

1. Navigate to any product page on a supported marketplace
2. Look for the **"Import to Wrenlist"** button on the page
3. Click the button
4. The product will be imported to your Wrenlist inventory
5. You'll be redirected to the product edit page (if enabled in settings)

### Bulk Import

1. Navigate to a marketplace listings/search page (with multiple products)
2. Checkboxes will appear on each product card
3. Select the products you want to import
4. A bulk action bar will appear at the bottom right
5. Click **"Import Selected"** to import all selected products
6. Watch the progress bar as imports complete
7. See a summary of successful and failed imports

### Publishing to Marketplaces

You can publish products FROM Wrenlist TO marketplaces using the extension API:

```javascript
// Publish a product
chrome.runtime.sendMessage({
  type: 'PUBLISH_TO_MARKETPLACE',
  marketplace: 'vinted',
  productData: {
    title: 'Product Title',
    description: 'Description',
    price: 25.99,
    condition: 'good',
    images: ['url1', 'url2'],
    brand: 'Brand Name'
  }
});

// Update a listing
chrome.runtime.sendMessage({
  type: 'UPDATE_MARKETPLACE_LISTING',
  marketplace: 'vinted',
  listingId: '123456',
  productData: { /* updated data */ }
});

// Delist a product
chrome.runtime.sendMessage({
  type: 'DELIST_FROM_MARKETPLACE',
  marketplace: 'vinted',
  listingId: '123456'
});
```

### Settings

1. Right-click the extension icon and select "Options"
2. Or click "Settings" in the popup
3. Configure:
   - **Auto-open Wrenlist** - Automatically open imported products
   - **Show notifications** - Browser notifications for imports
   - **Success message duration** - How long success message shows (1-10 seconds)
   - **Enabled marketplaces** - Choose which marketplaces to activate
   - **Export/Clear history** - Manage your import history

### Popup Dashboard

Click the extension icon to view:
- Current marketplace status
- Total imports and success rate
- Recent import history (last 10)
- Quick links to Wrenlist and Settings

## 🔧 Technical Details

### Architecture

- **Content Scripts** - Injected into marketplace pages to extract product data
- **Background Service Worker** - Handles API calls and data transformation
- **Options Page** - Settings management with persistent storage
- **Popup** - Dashboard with statistics and history

### Data Flow

1. Content script detects marketplace and product page
2. Extracts product data from page (JSON-LD, DOM, or embedded state)
3. Sends data to background script
4. Background script transforms data to Wrenlist format
5. Sends to Wrenlist API endpoint
6. Opens product page in Wrenlist (if enabled)
7. Stores import in history

### Data Storage

- **chrome.storage.sync** - Settings (auto-open, notifications, enabled marketplaces)
- **chrome.storage.local** - Import history (last 50 imports)

## 🛠️ Development

### File Structure

```
wrenlist-skylark-extension/
├── manifest.json              # Extension configuration
├── background.js              # Service worker (Crosslist code + Wrenlist handlers)
├── content-scripts/
│   └── content.js            # Content script for marketplace pages
├── popup.html                # Popup UI
├── popup.js                  # Popup logic
├── options.html              # Settings page UI
├── options.js                # Settings page logic
├── marketplaceRules.json     # Declarative net request rules
├── icons/                    # Extension icons
└── README.md                 # This file
```

### Key Components

- **Data Extraction** - Marketplace-specific extraction functions
- **Data Transformation** - Converts marketplace data to Wrenlist format
- **API Integration** - `/api/import/vinted-item` (Vinted) and `/api/import/marketplace-item` (others)
- **Settings Management** - Sync-based settings with real-time updates

## 🔒 Permissions

- **cookies** - Required for marketplace authentication
- **storage** - Store settings and import history
- **tabs** - Open Wrenlist after import
- **notifications** - Browser notifications
- **declarativeNetRequest** - Modify request headers for CORS
- **scripting** - Inject content scripts
- **host_permissions** - Access marketplace domains

## 🐛 Troubleshooting

### Button Not Appearing

1. Check if marketplace is enabled in Settings
2. Refresh the marketplace page
3. Check browser console for errors
4. Verify you're on a product page (not search/listings page)

### Import Fails

1. Check if you're logged into Wrenlist
2. Verify internet connection
3. Check browser console for error messages
4. Try refreshing the page and importing again

### Data Not Extracting Correctly

- The extension uses multiple extraction methods (JSON-LD, DOM, embedded state)
- If extraction fails, check the browser console for details
- Some marketplaces may have changed their page structure

## 📝 Notes

- Based on Crosslist extension architecture for stability
- All marketplace-specific code preserved for reliability
- Wrenlist-specific integration layer added on top
- Does not interfere with existing Wrenlist extension

## 🔄 Version History

### 1.1.0 (Current)
- ✅ **Bulk Import** - Select and import multiple products at once
- ✅ **Publishing Features** - Publish products TO marketplaces from Wrenlist
- ✅ **Update & Delist** - Update or remove marketplace listings
- ✅ **Advanced Error Handling** - Retry logic with exponential backoff
- ✅ **Rate Limiting** - Smart throttling (10 requests/minute)
- ✅ **Authentication Checks** - Pre-import auth verification
- ✅ **Image Optimization** - Hook for image compression (ready for implementation)

### 1.0.0
- Initial release
- Support for 8 marketplaces
- Import history and statistics
- Settings page
- Browser notifications
- Export functionality

## 📞 Support

For issues or questions:
- Visit [Wrenlist Support](https://wrenlist.com/support)
- Check browser console for error logs
- Ensure you're using the latest version

## 📄 License

Copyright © Wrenlist. All rights reserved.
