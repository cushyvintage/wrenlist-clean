'use client'

import { ConfirmProvider } from '@/components/wren/ConfirmProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileSidebar } from '@/components/layout/MobileSidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { BetaBanner } from '@/components/layout/BetaBanner'
import { SidebarItem } from '@/components/wren/SidebarItem'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { NavIcons } from '@/components/layout/NavIcons'
import { isAdmin } from '@/lib/admin'

// IDs that support nested routes (e.g. /finds/123 highlights Finds)
const NESTED_NAV_IDS = ['finds', 'sold', 'analytics', 'customers', 'sourcing', 'orders', 'suppliers', 'expenses', 'mileage', 'listings', 'templates', 'duplicates', 'platform-connect', 'admin-categories', 'admin-category-config', 'admin-import', 'admin-ops']

const ADMIN_NAV_ITEMS = [
  { id: 'admin-ops', label: 'Ops Dashboard', icon: NavIcons.admin, path: '/admin/ops', section: 'ADMIN', pageTitle: 'Admin — Ops Dashboard' },
  { id: 'admin-categories', label: 'Categories', icon: NavIcons.admin, path: '/admin/categories', section: 'ADMIN', pageTitle: 'Admin — Category Management' },
  { id: 'admin-category-config', label: 'Category Config', icon: NavIcons.admin, path: '/admin/category-config', section: 'ADMIN', pageTitle: 'Admin — Category Config' },
  { id: 'admin-import', label: 'Legacy Import', icon: NavIcons.import, path: '/admin/import', section: 'ADMIN', pageTitle: 'Admin — Legacy Import' },
  { id: 'testing', label: 'E2E Testing', icon: NavIcons.testing, path: '/testing', section: 'ADMIN', pageTitle: 'Admin — E2E Testing' },
]

const NAV_ITEMS = [
  // WORKSPACE
  { id: 'dashboard', label: 'Dashboard', icon: NavIcons.dashboard, path: '/dashboard', section: 'WORKSPACE', pageTitle: 'Dashboard' },
  { id: 'finds', label: 'Finds', icon: NavIcons.finds, path: '/finds', section: 'WORKSPACE', pageTitle: 'Finds' },
  { id: 'add-find', label: 'Add find', icon: NavIcons['add-find'], path: '/add-find', section: 'WORKSPACE', pageTitle: '' },
  { id: 'import', label: 'Import', icon: NavIcons.import, path: '/import', section: 'WORKSPACE', pageTitle: 'Import' },
  { id: 'scanner', label: 'Scanner', icon: NavIcons.scanner, path: '/scanner', section: 'WORKSPACE', pageTitle: 'Barcode & ISBN Scanner' },
  { id: 'listings', label: 'Listings', icon: NavIcons.listings, path: '/listings', section: 'WORKSPACE', pageTitle: 'Listings' },
  { id: 'duplicates', label: 'Duplicates', icon: NavIcons.finds, path: '/duplicates', section: 'WORKSPACE', pageTitle: 'Duplicates' },
  { id: 'jobs', label: 'Jobs', icon: NavIcons.jobs, path: '/jobs', section: 'WORKSPACE', pageTitle: 'Jobs' },
  { id: 'templates', label: 'Templates', icon: NavIcons.templates, path: '/templates', section: 'WORKSPACE', pageTitle: 'Templates' },
  // INSIGHTS
  { id: 'insights', label: 'Wren Insights', icon: NavIcons.insights, path: '/insights', section: 'INSIGHTS', pageTitle: 'Insight history' },
  { id: 'analytics', label: 'Analytics', icon: NavIcons.analytics, path: '/analytics', section: 'INSIGHTS', pageTitle: 'Analytics' },
  { id: 'price-research', label: 'Price Research', icon: NavIcons['price-research'], path: '/price-research', section: 'INSIGHTS', pageTitle: 'Price Research' },
  { id: 'sold', label: 'Sold', icon: NavIcons.sold, path: '/sold', section: 'INSIGHTS', pageTitle: 'Sold' },
  { id: 'customers', label: 'Customers', icon: NavIcons.customers, path: '/customers', section: 'INSIGHTS', pageTitle: 'Customers' },
  // OPERATIONS
  { id: 'orders', label: 'Orders', icon: NavIcons.orders, path: '/orders', section: 'OPERATIONS', pageTitle: 'Orders' },
  { id: 'sourcing', label: 'Sourcing', icon: NavIcons.sourcing, path: '/sourcing', section: 'OPERATIONS', pageTitle: 'Sourcing' },
  { id: 'suppliers', label: 'Suppliers', icon: NavIcons.suppliers, path: '/suppliers', section: 'OPERATIONS', pageTitle: 'Suppliers' },
  { id: 'expenses', label: 'Expenses', icon: NavIcons.expenses, path: '/expenses', section: 'OPERATIONS', pageTitle: 'Expenses' },
  { id: 'mileage', label: 'Mileage', icon: NavIcons.mileage, path: '/mileage', section: 'OPERATIONS', pageTitle: 'Mileage' },
  { id: 'tax', label: 'Tax', icon: NavIcons.tax, path: '/tax', section: 'OPERATIONS', pageTitle: 'Tax' },
  // SETTINGS
  { id: 'platform-connect', label: 'Platform Connect', icon: NavIcons['platform-connect'], path: '/platform-connect', section: 'SETTINGS', pageTitle: 'Platform Connect' },
  { id: 'billing', label: 'Billing', icon: NavIcons.billing, path: '/billing', section: 'SETTINGS', pageTitle: 'Billing' },
  { id: 'settings', label: 'Settings', icon: NavIcons.settings, path: '/settings', section: 'SETTINGS', pageTitle: 'Settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthContext()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  const navItems = useMemo(
    () => (isAdmin(user?.email) ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS),
    [user?.email]
  )

  const currentPage = navItems.find((item) => activeNav === item.id)
  const pageTitle = currentPage?.pageTitle

  // Sync document.title from nav config
  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} | Wrenlist`
  }, [pageTitle])

  // Set active nav based on current pathname
  useEffect(() => {
    const currentItem = NAV_ITEMS.find((item) => {
      // Exact match
      if (pathname === item.path) return true
      // Nested routes: highlight parent nav item for sub-paths
      if (pathname.startsWith(item.path + '/') && NESTED_NAV_IDS.includes(item.id)) return true
      return false
    })

    if (currentItem) {
      setActiveNav(currentItem.id)
    }
  }, [pathname])

  const handleNavClick = (id: string, path: string) => {
    setMobileMenuOpen(false)
    router.push(path)
  }

  const handleAddFind = () => {
    router.push('/add-find')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <ConfirmProvider>
    <div className="h-screen overflow-hidden" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Sidebar */}
      <Sidebar
        userInfo={{
          name: user?.full_name || user?.email?.split('@')[0] || 'User',
          plan: 'Beta',
        }}
      >
        {/* Group nav items by section */}
        {['WORKSPACE', 'INSIGHTS', 'OPERATIONS', 'SETTINGS', 'ADMIN'].map((section) => (
          <div key={section}>
            {navItems.some((item) => item.section === section) && (
              <>
                <div
                  className="text-[9px] uppercase tracking-[.12em] px-[18px] py-5 font-semibold"
                  style={{ color: '#3D5C3A' }}
                >
                  {section}
                </div>
                {navItems
                  .filter((item) => item.section === section)
                  .map((item) => (
                    <SidebarItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={activeNav === item.id}
                      onClick={() => handleNavClick(item.id, item.path)}
                    />
                  ))}
                {section !== 'ADMIN' && (
                  <div
                    className="h-px mx-3 my-1"
                    style={{ backgroundColor: 'rgba(255,255,255,.06)' }}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </Sidebar>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        userInfo={{
          name: user?.full_name || user?.email?.split('@')[0] || 'User',
          plan: 'Beta',
        }}
      >
        {['WORKSPACE', 'INSIGHTS', 'OPERATIONS', 'SETTINGS', 'ADMIN'].map((section) => (
          <div key={section}>
            {navItems.some((item) => item.section === section) && (
              <>
                <div
                  className="text-[9px] uppercase tracking-[.12em] px-[18px] py-5 font-semibold"
                  style={{ color: '#3D5C3A' }}
                >
                  {section}
                </div>
                {navItems
                  .filter((item) => item.section === section)
                  .map((item) => (
                    <SidebarItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={activeNav === item.id}
                      onClick={() => handleNavClick(item.id, item.path)}
                    />
                  ))}
                {section !== 'ADMIN' && (
                  <div
                    className="h-px mx-3 my-1"
                    style={{ backgroundColor: 'rgba(255,255,255,.06)' }}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </MobileSidebar>

      {/* Main content area */}
      <div className="md:ml-[210px] flex flex-col h-full">
        {/* Beta banner */}
        <BetaBanner />

        {/* Top bar with user menu */}
        <AppTopbar
          title={pageTitle}
          onMenuClick={() => setMobileMenuOpen(true)}
          actions={activeNav === 'add-find' ? [] : [{ label: '+ Add find', onClick: handleAddFind, variant: 'primary' }]}
          rightSlot={
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded transition-colors"
                style={{ backgroundColor: 'transparent' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden"
                  style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
                >
                  {user?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <span
                  className="hidden sm:inline text-sm font-medium"
                  style={{ color: '#1E2E1C' }}
                >
                  {user?.full_name || user?.email?.split('@')[0] || 'User'}
                </span>
              </button>

              {/* User menu dropdown */}
              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50"
                  style={{ borderColor: 'rgba(61,92,58,.14)', borderWidth: '1px' }}
                >
                  <div
                    className="px-4 py-3"
                    style={{ borderBottomColor: 'rgba(61,92,58,.14)', borderBottomWidth: '1px' }}
                  >
                    <p className="text-sm font-medium" style={{ color: '#1E2E1C' }}>
                      {user?.full_name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs" style={{ color: '#6B7D6A' }}>
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/settings')}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{ color: '#1E2E1C' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{ color: '#C0392B', borderTopColor: 'rgba(61,92,58,.14)', borderTopWidth: '1px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAE5E3')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          }
        />

        {/* Page content */}
        <main className="flex-1 min-h-0 mt-[60px] p-4 sm:p-5 md:p-7 overflow-y-auto" style={{ backgroundColor: '#F5F0E8' }}>
          {children}
        </main>
      </div>
    </div>
    </ConfirmProvider>
  )
}
