/**
 * Sidebar Component
 * Main navigation sidebar for authenticated app
 *
 * Design: dark forest green (#1E2E1C) background, contains SidebarItem components
 * Used in app/(auth)/layout.tsx to provide persistent navigation
 * Fixed position on left side of dashboard/inventory/etc pages
 *
 * @example
 * <Sidebar>
 *   <SidebarItem icon={<DashboardIcon />} label="Dashboard" active onClick={() => {}} />
 *   <SidebarItem icon={<InventoryIcon />} label="Inventory" onClick={() => {}} />
 * </Sidebar>
 */

interface SidebarProps {
  /** Navigation items to display */
  children?: React.ReactNode
  /** Optional custom className */
  className?: string
}

export function Sidebar({ children, className = '' }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-52 bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto ${className}`}
      style={{ backgroundColor: '#1E2E1C' }}
    >
      {/* Logo / branding area */}
      <div className="px-4 py-6 border-b border-slate-700">
        <div className="text-xl font-serif text-cream-pale font-medium">Wren</div>
        <div className="text-xs uppercase tracking-wider text-sage-dim mt-0.5">Inventory</div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1">{children}</nav>

      {/* Footer area with user/settings */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="text-xs text-sage-dim">Logged in as user</div>
      </div>
    </aside>
  )
}
