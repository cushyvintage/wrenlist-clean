'use client'

import { Package } from 'lucide-react'

interface StashBadgeProps {
  name: string | null
  onClick?: () => void
  size?: 'sm' | 'md'
}

/**
 * StashBadge — displays a stash name with a box icon.
 * Shows "No stash" state when name is null.
 */
export default function StashBadge({ name, onClick, size = 'sm' }: StashBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  if (!name) {
    return (
      <span
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-full border border-sage/14 text-sage-dim ${sizeClasses} ${onClick ? 'cursor-pointer hover:bg-cream-md' : ''}`}
      >
        <Package className={iconSize} />
        No stash
      </span>
    )
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full bg-sage/10 text-sage border border-sage/20 ${sizeClasses} ${onClick ? 'cursor-pointer hover:bg-sage/15' : ''}`}
    >
      <Package className={iconSize} />
      {name}
    </span>
  )
}
