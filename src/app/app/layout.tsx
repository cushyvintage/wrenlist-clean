'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { AppTopbar } from '@/components/layout/AppTopbar'
import { SidebarItem } from '@/components/wren/SidebarItem'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('dashboard')

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
        {/* Top bar */}
        <AppTopbar
          actions={[
            { label: '+ Add find', onClick: handleAddFind, variant: 'primary' },
          ]}
        />

        {/* Page content */}
        <main className="flex-1 mt-16 p-8">{children}</main>
      </div>
    </div>
  )
}
