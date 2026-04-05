'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { SidebarItem } from '@/components/wren/SidebarItem'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { NavIcons } from '@/components/layout/NavIcons'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthContext()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    // WORKSPACE
    { id: 'dashboard', label: 'Dashboard', icon: NavIcons.dashboard, path: '/dashboard', section: 'WORKSPACE', pageTitle: 'Dashboard' },
    { id: 'finds', label: 'Finds', icon: NavIcons.finds, path: '/finds', section: 'WORKSPACE', pageTitle: 'Finds' },
    { id: 'add-find', label: 'Add find', icon: NavIcons['add-find'], path: '/add-find', section: 'WORKSPACE', pageTitle: '' },
    { id: 'import', label: 'Import', icon: NavIcons.import, path: '/import', section: 'WORKSPACE', pageTitle: 'Import' },
    { id: 'scanner', label: 'Scanner', icon: NavIcons.scanner, path: '/scanner', section: 'WORKSPACE', pageTitle: 'Barcode & ISBN Scanner' },
    { id: 'listings', label: 'Listings', icon: NavIcons.listings, path: '/listings', section: 'WORKSPACE', pageTitle: 'Listings' },
    // INSIGHTS
    { id: 'analytics', label: 'Analytics', icon: NavIcons.analytics, path: '/analytics', section: 'INSIGHTS', pageTitle: 'Analytics' },
    { id: 'price-research', label: 'Price Research', icon: NavIcons['price-research'], path: '/price-research', section: 'INSIGHTS', pageTitle: 'Price Research' },
    { id: 'sold', label: 'Sold', icon: NavIcons.sold, path: '/sold', section: 'INSIGHTS', pageTitle: 'Sold' },
    // OPERATIONS
    { id: 'sourcing', label: 'Sourcing', icon: NavIcons.sourcing, path: '/sourcing', section: 'OPERATIONS', pageTitle: 'Sourcing' },
    { id: 'suppliers', label: 'Suppliers', icon: NavIcons.suppliers, path: '/suppliers', section: 'OPERATIONS', pageTitle: 'Suppliers' },
    { id: 'expenses', label: 'Expenses', icon: NavIcons.expenses, path: '/expenses', section: 'OPERATIONS', pageTitle: 'Expenses' },
    { id: 'mileage', label: 'Mileage', icon: NavIcons.mileage, path: '/mileage', section: 'OPERATIONS', pageTitle: 'Mileage' },
    { id: 'tax', label: 'Tax', icon: NavIcons.tax, path: '/tax', section: 'OPERATIONS', pageTitle: 'Tax' },
    // SETTINGS
    { id: 'platform-connect', label: 'Platform Connect', icon: NavIcons['platform-connect'], path: '/platform-connect', section: 'SETTINGS', pageTitle: 'Platform Connect' },
    { id: 'settings', label: 'Settings', icon: NavIcons.settings, path: '/settings', section: 'SETTINGS', pageTitle: 'Settings' },
  ]

  const currentPage = navItems.find((item) => activeNav === item.id)
  const pageTitle = currentPage?.pageTitle

  // Set active nav based on current pathname
  useEffect(() => {
    const currentItem = navItems.find((item) => {
      // Exact match first
      if (pathname === item.path) return true
      // Check if pathname starts with the item's path (for nested routes)
      if (pathname.startsWith(item.path + '/')) {
        // Special case: /finds/[id] should highlight finds
        return item.id === 'finds'
      }
      return false
    })

    if (currentItem) {
      setActiveNav(currentItem.id)
    }
  }, [pathname])

  const handleNavClick = (id: string, path: string) => {
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
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Sidebar */}
      <Sidebar
        userInfo={{
          name: user?.full_name || user?.email?.split('@')[0] || 'User',
          plan: 'Nester',
        }}
      >
        {/* Group nav items by section */}
        {['WORKSPACE', 'INSIGHTS', 'OPERATIONS', 'SETTINGS'].map((section) => (
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
                {section !== 'SETTINGS' && (
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

      {/* Main content area */}
      <div className="md:ml-[210px] flex flex-col min-h-screen">
        {/* Top bar with user menu */}
        <AppTopbar
          title={pageTitle}
          actions={activeNav === 'add-find' ? [] : [{ label: '+ Add find', onClick: handleAddFind, variant: 'primary' }]}
          rightSlot={
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded transition-colors"
                style={{ backgroundColor: 'transparent' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
                >
                  {(user?.full_name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start text-xs">
                  <span className="font-medium" style={{ color: '#1E2E1C' }}>
                    {user?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-xs" style={{ color: '#6B7D6A' }}>
                    {user?.email}
                  </span>
                </div>
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
        <main className="flex-1 mt-[60px] p-7" style={{ backgroundColor: '#F5F0E8' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
