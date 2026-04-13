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
 *   onClick={() => router.push('/dashboard')}
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
  /** Optional notification badge count */
  badge?: number
}

export function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
  badge,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      style={active ? { backgroundColor: 'rgba(255,255,255,.07)', color: '#C8DEC6', borderLeftColor: '#5A7A57' } : { borderLeftColor: 'transparent', color: '#7A9A78' }}
      className="w-full flex items-center gap-[9px] px-[18px] py-[9px] text-sm transition-all border-l-[2px]"
      onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.04)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = '')}
    >
      {/* Icon: 14px, 70% opacity */}
      <div className="w-[14px] h-[14px] flex-shrink-0" style={{ opacity: 0.7 }}>
        {icon}
      </div>

      {/* Label: 13px */}
      <span className="text-[13px] font-normal flex-1 text-left">{label}</span>

      {/* Badge */}
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}
