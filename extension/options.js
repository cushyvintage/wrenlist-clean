/**
 * Wrenlist Skylark - Options Page Script
 */

document.addEventListener('DOMContentLoaded', function() {
  const marketplaces = [
    { id: 'vinted', name: 'Vinted', enabled: true },
    { id: 'ebay', name: 'eBay', enabled: true },
    { id: 'depop', name: 'Depop', enabled: true },
    { id: 'poshmark', name: 'Poshmark', enabled: true },
    { id: 'mercari', name: 'Mercari', enabled: true },
    { id: 'grailed', name: 'Grailed', enabled: true },
    { id: 'facebook', name: 'Facebook Marketplace', enabled: true },
    { id: 'etsy', name: 'Etsy', enabled: true }
  ];
  
  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get([
      'autoOpenWrenlist',
      'showNotifications',
      'successMessageDuration',
      'enabledMarketplaces'
    ], (result) => {
      // Auto-open Wrenlist (default: true)
      document.getElementById('autoOpenWrenlist').checked = 
        result.autoOpenWrenlist !== false;
      
      // Show notifications (default: true)
      document.getElementById('showNotifications').checked = 
        result.showNotifications !== false;
      
      // Success message duration (default: 3)
      document.getElementById('successMessageDuration').value = 
        result.successMessageDuration || 3;
      
      // Enabled marketplaces
      const enabledMarketplaces = result.enabledMarketplaces || 
        marketplaces.map(m => m.id);
      
      // Render marketplace checkboxes
      const marketplaceList = document.getElementById('marketplaceList');
      marketplaceList.innerHTML = marketplaces.map(mp => `
        <div class="marketplace-item">
          <input type="checkbox" 
                 id="mp-${mp.id}" 
                 value="${mp.id}"
                 ${enabledMarketplaces.includes(mp.id) ? 'checked' : ''}>
          <label for="mp-${mp.id}">${mp.name}</label>
        </div>
      `).join('');
    });
    
    // Set version
    document.getElementById('version').textContent = 
      chrome.runtime.getManifest().version;
  }
  
  // Save settings
  function saveSettings() {
    const autoOpenWrenlist = document.getElementById('autoOpenWrenlist').checked;
    const showNotifications = document.getElementById('showNotifications').checked;
    const successMessageDuration = parseInt(
      document.getElementById('successMessageDuration').value
    );
    
    const enabledMarketplaces = Array.from(
      document.querySelectorAll('#marketplaceList input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    chrome.storage.sync.set({
      autoOpenWrenlist: autoOpenWrenlist,
      showNotifications: showNotifications,
      successMessageDuration: successMessageDuration,
      enabledMarketplaces: enabledMarketplaces
    }, () => {
      showStatus('Settings saved successfully!', 'success');
      
      // Notify all content scripts about settings change
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_CHANGED'
          }).catch(() => {}); // Ignore errors for tabs without content script
        });
      });
    });
  }
  
  // Reset to defaults
  function resetSettings() {
    if (confirm('Reset all settings to default values?')) {
      chrome.storage.sync.clear(() => {
        loadSettings();
        showStatus('Settings reset to defaults', 'success');
      });
    }
  }
  
  // Export history
  function exportHistory() {
    chrome.storage.local.get(['importHistory'], (result) => {
      const history = result.importHistory || [];
      
      if (history.length === 0) {
        showStatus('No import history to export', 'error');
        return;
      }
      
      // Convert to CSV
      const headers = ['Timestamp', 'Marketplace', 'Product Title', 'Product ID', 'Wrenlist ID', 'Status', 'Error'];
      const rows = history.map(item => [
        item.timestamp,
        item.marketplace,
        `"${(item.productTitle || 'Unknown').replace(/"/g, '""')}"`,
        item.productId,
        item.productId_wrenlist || '',
        item.success ? 'Success' : 'Failed',
        item.error || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Download as file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wrenlist-import-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus('History exported successfully!', 'success');
    });
  }
  
  // Clear history
  function clearHistory() {
    if (confirm('Clear all import history? This action cannot be undone.')) {
      chrome.storage.local.remove(['importHistory'], () => {
        showStatus('Import history cleared', 'success');
      });
    }
  }
  
  // Show status message
  function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    setTimeout(() => {
      statusEl.className = 'status-message';
    }, 3000);
  }
  
  // Event listeners
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('exportHistory').addEventListener('click', exportHistory);
  document.getElementById('clearHistory').addEventListener('click', clearHistory);
  
  // Load settings on page load
  loadSettings();
});

