/**
 * Wrenlist Extension — Popup Script
 * Quick actions hub with plan info, stats, publish queue + recent activity
 */

document.addEventListener('DOMContentLoaded', function () {
  const authView = document.getElementById('authView')
  const signinView = document.getElementById('signinView')

  // Version from manifest
  const manifest = chrome.runtime.getManifest()
  const version = `v${manifest.version}`
  document.querySelectorAll('#versionText, #footerVersion, .header-version').forEach(el => {
    el.textContent = version
  })

  // Plan display names
  const PLAN_NAMES = {
    free: 'Free',
    nester: 'Nester',
    forager: 'Forager',
    flock: 'Flock',
  }

  // --- Auth check via background worker (which can read cookies) ---
  async function checkAuth() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'get_auth_info' }, response => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(null)
          return
        }
        const data = response.data
        if (!data || !data.user) {
          resolve(null)
          return
        }
        resolve(data) // { user, plan, stats }
      })
    })
  }

  function showSignedIn() {
    authView.classList.remove('hidden')
    signinView.classList.add('hidden')
  }

  function showSignedOut() {
    authView.classList.add('hidden')
    signinView.classList.remove('hidden')
  }

  // --- Render plan + stats from API data ---
  function renderPlanAndStats(data) {
    // User email
    if (data.user?.email) {
      document.getElementById('connectionText').textContent = data.user.email
    }

    // Plan badge
    if (data.plan) {
      const badge = document.getElementById('planBadge')
      const planId = data.plan.id || 'free'
      badge.textContent = PLAN_NAMES[planId] || planId
      badge.className = `plan-badge ${planId}`

      // Finds usage bar (show for free and nester — plans with meaningful limits)
      if (planId === 'free' || planId === 'nester') {
        const findsBar = document.getElementById('findsBar')
        const findsFill = document.getElementById('findsFill')
        const findsText = document.getElementById('findsText')
        const used = data.plan.finds_this_month || 0
        const limit = data.plan.finds_limit || 5
        const pct = Math.min((used / limit) * 100, 100)

        findsBar.classList.remove('hidden')
        findsFill.style.width = `${pct}%`
        findsText.textContent = `${used} / ${limit} finds`

        // Color coding
        findsFill.classList.remove('warning', 'full')
        if (pct >= 100) findsFill.classList.add('full')
        else if (pct >= 80) findsFill.classList.add('warning')
      }

      // Upgrade nudge (free plan only)
      if (planId === 'free') {
        const nudge = document.getElementById('upgradeNudge')
        nudge.classList.remove('hidden')
      }
    }

    // Stats strip
    if (data.stats) {
      const strip = document.getElementById('statsStrip')
      strip.style.display = 'grid'
      document.getElementById('statFinds').textContent = data.stats.total_finds ?? '—'
      document.getElementById('statListings').textContent = data.stats.active_listings ?? '—'
      document.getElementById('statPlatforms').textContent = data.stats.connected_platforms ?? '—'
    }
  }

  // --- Fetch via background worker (has cookie access) ---
  function bgFetch(url) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'bg_fetch', url }, response => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(null)
          return
        }
        resolve(response.data)
      })
    })
  }

  // --- Publish queue ---
  async function loadPublishQueue() {
    try {
      const data = await bgFetch('https://app.wrenlist.com/api/marketplace/publish-queue')
      if (!data) return
      const items = data.data || data || []

      const section = document.getElementById('queueSection')
      const list = document.getElementById('queueList')
      const badge = document.getElementById('queueCount')
      const hint = document.getElementById('queueHint')

      if (items.length > 0) {
        section.classList.remove('hidden')
        badge.textContent = items.length
        hint.textContent = `${items.length} pending`

        list.innerHTML = items.slice(0, 4).map(item => {
          const title = item.title || item.find_title || 'Untitled'
          const platform = item.marketplace || item.platform || '?'
          return `
            <div class="list-item">
              <div class="list-item-left">
                <div class="list-item-title">${escapeHtml(title)}</div>
              </div>
              <span class="list-item-arrow">&rarr;</span>
              <span class="list-item-platform">${escapeHtml(capitalize(platform))}</span>
              <div class="list-item-status pending"></div>
            </div>
          `
        }).join('')

        if (items.length > 4) {
          list.innerHTML += `<div class="list-item" style="justify-content:center;color:#8A9E88;font-size:11px;">+${items.length - 4} more</div>`
        }
      } else {
        section.classList.add('hidden')
        hint.textContent = 'Check pending'
      }
    } catch {
      // Silently fail — queue is optional
    }
  }

  // --- Recent activity ---
  function loadActivity() {
    chrome.storage.local.get(['importHistory'], result => {
      const history = result.importHistory || []
      const list = document.getElementById('activityList')

      if (history.length === 0) {
        list.innerHTML = '<div class="list-empty">No recent activity yet</div>'
        return
      }

      const recent = history.slice(0, 6)
      list.innerHTML = recent.map(item => {
        const title = item.productTitle || 'Unknown item'
        const time = getTimeAgo(new Date(item.timestamp))
        const isSuccess = item.success !== false

        return `
          <div class="list-item">
            <div class="list-item-left">
              <div class="list-item-status ${isSuccess ? 'success' : 'error'}"></div>
              <div class="list-item-title">${escapeHtml(title)}</div>
            </div>
            <div class="list-item-meta">${time}</div>
          </div>
        `
      }).join('')
    })
  }

  // --- Action handlers ---
  document.getElementById('actionAddFind')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.wrenlist.com/add-find', active: true })
  })

  document.getElementById('actionFinds')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.wrenlist.com/finds', active: true })
  })

  document.getElementById('actionQueue')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.wrenlist.com/listings', active: true })
  })

  document.getElementById('actionOpen')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.wrenlist.com', active: true })
  })

  document.getElementById('openSettings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })

  document.getElementById('signinOpenSettings')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })

  document.getElementById('signInButton')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.wrenlist.com/login', active: true })
  })

  document.getElementById('upgradeBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.wrenlist.com/pricing', active: true })
  })

  // --- Utilities ---
  function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // --- Initialize ---
  async function init() {
    const data = await checkAuth()
    if (data) {
      showSignedIn()
      renderPlanAndStats(data)
      loadActivity()
      loadPublishQueue()
    } else {
      showSignedOut()
    }
  }

  init()

  // Listen for import status updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'IMPORT_STATUS') {
      setTimeout(() => loadActivity(), 500)
    }
  })
})
