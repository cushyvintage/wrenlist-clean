/**
 * Sidebar Component
 * Main navigation sidebar for authenticated app
 *
 * Design: dark forest green (#1E2E1C) background with sage-pale text
 * Fixed width: 210px
 * Contains navigation sections and user info
 */

interface SidebarProps {
  children?: React.ReactNode
  className?: string
  userInfo?: {
    name: string
    plan: string
  }
}

export function Sidebar({ children, className = '', userInfo }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-[210px] flex flex-col overflow-y-auto ${className}`}
      style={{ backgroundColor: '#1E2E1C' }}
    >
      {/* Logo / branding area */}
      <div className="px-[18px] py-6 border-b" style={{ borderColor: 'rgba(255,255,255,.07)' }}>
        <div className="font-serif text-base font-medium" style={{ color: '#C8DEC6' }}>
          Wrenlist
        </div>
        <div className="text-[9px] uppercase tracking-[.12em] mt-1" style={{ color: '#3D5C3A', fontWeight: 600 }}>
          Resale
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1">{children}</nav>

      {/* Footer area with user/settings */}
      <div className="px-[18px] py-4 border-t" style={{ borderColor: 'rgba(255,255,255,.07)' }}>
        {userInfo && (
          <>
            <div className="text-[9px] uppercase tracking-[.08em] mb-1" style={{ color: '#3D5C3A', fontWeight: 600 }}>
              Plan
            </div>
            <div className="text-sm" style={{ color: '#7A9A78' }}>
              {userInfo.plan}
            </div>
            <div className="text-[11px] mt-1" style={{ color: '#4A6A48' }}>
              {userInfo.name}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
