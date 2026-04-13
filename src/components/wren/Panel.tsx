/**
 * Panel Component
 * Reusable card container with optional header and action link
 *
 * Design: white bg, border, rounded-md, no shadow
 * Matches design mockup panel styling
 *
 * @example
 * <Panel title="recent inventory" action="view all →">
 *   <InventoryTable {...props} />
 * </Panel>
 */

import React from 'react'

interface PanelProps {
  /** Optional panel title (uppercase label) — string or ReactNode for custom headers */
  title?: React.ReactNode
  /** Optional action link text + handler */
  action?: {
    text: string
    onClick?: () => void
  }
  /** Panel content */
  children: React.ReactNode
  /** Optional padding override (default: p-5) */
  className?: string
}

export function Panel({
  title,
  action,
  children,
  className = 'p-5',
}: PanelProps) {
  return (
    <div className="bg-white border border-sage/14 rounded-md">
      {/* Panel header */}
      {(title || action) && (
        <div className="border-b border-sage/14 px-5 py-3 flex justify-between items-center">
          {title && (
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">
              {title}
            </div>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs text-sage-lt hover:text-sage transition-colors cursor-pointer"
            >
              {action.text}
            </button>
          )}
        </div>
      )}

      {/* Panel content */}
      <div className={className}>{children}</div>
    </div>
  )
}
