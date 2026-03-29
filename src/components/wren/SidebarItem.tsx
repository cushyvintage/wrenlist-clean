/**
 * SidebarItem Component
 * Navigation item for app sidebar
 *
 * Design: dark forest sidebar item with icon + text
 * Active state: rgba white 7% bg + sage-lt left border
 * Matches design mockup sidebar nav items
 *
 * @example
 * <SidebarItem
 *   icon={DashboardIcon}
 *   label="dashboard"
 *   active={true}
 *   onClick={() => router.push('/app/dashboard')}
 * />
 */

import React from 'react'

interface SidebarItemProps {
  /** SVG icon (React component) */
  icon: React.ReactNode
  /** Nav label text */
  label: string
  /** Whether this item is currently active */
  active?: boolean
  /** Click handler */
  onClick?: () => void
}

export function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded transition-colors ${
        active
          ? 'bg-white/7 border-l-2 border-sage-lt text-cream-pale'
          : 'text-sage-dim hover:text-cream-pale border-l-2 border-transparent'
      }`}
    >
      {/* Icon: 14px, 70% opacity */}
      <div className="w-4 h-4 flex-shrink-0 opacity-70">{icon}</div>

      {/* Label: 13px */}
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
    </button>
  )
}
