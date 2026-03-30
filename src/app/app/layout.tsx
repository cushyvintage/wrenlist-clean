'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { SidebarItem } from '@/components/wren/SidebarItem'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { logoutUser } from '@/services/auth.service'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuthContext()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/app/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: '📦', path: '/app/inventory' },
    { id: 'add-find', label: 'Add find', icon: '➕', path: '/app/add-find' },
    { id: 'listings', label: 'Listings', icon: '📋', path: '/app/listings' },
    { id: 'analytics', label: 'Analytics', icon: '📈', path: '/app/analytics' },
  ]

  const handleNavClick = (id: string, path: string) => {
    setActiveNav(id)
    router.push(path)
  }

  const handleAddFind = () => {
    router.push('/app/add-find')
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Sidebar */}
      <Sidebar>
        {navItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeNav === item.id}
            onClick={() => handleNavClick(item.id, item.path)}
          />
        ))}
      </Sidebar>

      {/* Main content area */}
      <div className="ml-52 flex flex-col min-h-screen">
        {/* Top bar with user menu */}
        <AppTopbar
          actions={[{ label: '+ Add find', onClick: handleAddFind, variant: 'primary' }]}
          rightSlot={
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-cream-md transition-colors"
              >
                <div className="w-8 h-8 bg-sage rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user && user.email[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:flex flex-col items-start text-xs">
                  <span className="font-medium text-ink">{user ? user.email.split('@')[0] : 'User'}</span>
                  <span className="text-ink-lt text-xs">{user?.email || 'Not logged in'}</span>
                </div>
              </button>

              {/* User menu dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-sage/14 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-sage/14">
                    <p className="text-sm font-medium text-ink">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-ink-lt">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => router.push('/app/settings')}
                    className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-cream-md transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-sage/14"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          }
        />

        {/* Page content */}
        <main className="flex-1 mt-16 p-8">{children}</main>
      </div>
    </div>
  )
}
