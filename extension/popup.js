/**
 * Wrenlist Skylark - Popup Script
 */

document.addEventListener('DOMContentLoaded', function() {
  const statusText = document.getElementById('statusText');
  const statusDiv = document.getElementById('status');
  const openWrenlistButton = document.getElementById('openWrenlist');
  const openSettingsButton = document.getElementById('openSettings');
  const statsDiv = document.getElementById('stats');
  const recentImportsDiv = document.getElementById('recentImports');
  const totalImportsEl = document.getElementById('totalImports');
  const successRateEl = document.getElementById('successRate');
  const importListEl = document.getElementById('importList');

  // Check if user is authenticated
  async function checkAuth() {
    try {
      const response = await fetch('https://app.wrenlist.com/api/auth/me', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 401 || !response.ok) {
        showNotSignedInState();
        return false;
      }

      const data = await response.json();
      if (!data || !data.user) {
        showNotSignedInState();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      // On network error, assume user might be logged in and continue
      return true;
    }
  }

  function showNotSignedInState() {
    // Hide all content
    statsDiv.style.display = 'none';
    recentImportsDiv.style.display = 'none';

    // Update status to show not signed in
    statusText.innerHTML = 'Sign in to Wrenlist to use Marketplace Sync';
    statusDiv.className = 'status error';

    // Replace button group
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.innerHTML = `
      <button class="button" id="signInButton">Sign In</button>
    `;

    const signInButton = document.getElementById('signInButton');
    signInButton.addEventListener('click', function() {
      chrome.tabs.create({
        url: 'https://app.wrenlist.com/login',
        active: true
      });
    });

    openSettingsButton.style.display = 'none';
  }
  
  // Load and display import history
  function loadImportHistory() {
    chrome.storage.local.get(['importHistory'], (result) => {
      const history = result.importHistory || [];
      
      if (history.length > 0) {
        // Show stats
        statsDiv.style.display = 'grid';
        totalImportsEl.textContent = history.length;
        
        // Calculate success rate
        const successful = history.filter(h => h.success).length;
        const successRate = history.length > 0 
          ? Math.round((successful / history.length) * 100)
          : 0;
        successRateEl.textContent = `${successRate}%`;
        
        // Show recent imports
        recentImportsDiv.style.display = 'block';
        const recentImports = history.slice(0, 10); // Show last 10
        
        importListEl.innerHTML = recentImports.map(importItem => {
          const date = new Date(importItem.timestamp);
          const timeAgo = getTimeAgo(date);
          const marketplaceIcon = getMarketplaceIcon(importItem.marketplace);
          
          return `
            <div class="import-item ${importItem.success ? 'success' : 'error'}">
              <div class="import-title" title="${importItem.productTitle || 'Unknown'}">
                ${marketplaceIcon} ${importItem.productTitle || 'Unknown'}
              </div>
              <div class="import-meta">
                ${timeAgo}<br>
                ${importItem.success ? '✓' : '✗'}
              </div>
            </div>
          `;
        }).join('');
      } else {
        statsDiv.style.display = 'none';
        recentImportsDiv.style.display = 'none';
      }
    });
  }
  
  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  
  function getMarketplaceIcon(marketplace) {
    const icons = {
      'vinted': '📦',
      'ebay': '💰',
      'depop': '👕',
      'poshmark': '👗',
      'mercari': '🛍️',
      'grailed': '👔',
      'facebook': '📘',
      'etsy': '🎨'
    };
    return icons[marketplace] || '📦';
  }
  
  // Open Wrenlist button
  openWrenlistButton.addEventListener('click', function() {
    chrome.tabs.create({
      url: 'https://wrenlist.com',
      active: true
    });
  });
  
  // Open settings button
  openSettingsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // Check current tab to see if we're on a supported marketplace
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0]) {
      const url = tabs[0].url;
      const supportedMarketplaces = [
        { name: 'Vinted', pattern: /vinted\./ },
        { name: 'eBay', pattern: /ebay\./ },
        { name: 'Depop', pattern: /depop\./ },
        { name: 'Poshmark', pattern: /poshmark\./ },
        { name: 'Mercari', pattern: /mercari\./ },
        { name: 'Grailed', pattern: /grailed\./ },
        { name: 'Facebook', pattern: /facebook\.com\/marketplace/ },
        { name: 'Etsy', pattern: /etsy\.com/ }
      ];
      
      const marketplace = supportedMarketplaces.find(mp => mp.pattern.test(url));
      
      if (marketplace) {
        statusText.textContent = `On ${marketplace.name} - Click "Import to Wrenlist" button on product page`;
        statusDiv.className = 'status success';
      } else {
        statusText.textContent = 'Visit a supported marketplace product page to import';
        statusDiv.className = 'status';
      }
    }
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'IMPORT_STATUS') {
      if (message.success) {
        statusText.textContent = `Successfully imported! Product ID: ${message.productId}`;
        statusDiv.className = 'status success';
        // Reload history to show new import
        setTimeout(() => loadImportHistory(), 500);
      } else {
        statusText.textContent = `Import failed: ${message.error}`;
        statusDiv.className = 'status error';
        // Reload history to show failed import
        setTimeout(() => loadImportHistory(), 500);
      }
    }
  });
  
  // Initialize popup: check auth first, then load history
  async function initializePopup() {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
      loadImportHistory();
    }
  }

  initializePopup();
});

