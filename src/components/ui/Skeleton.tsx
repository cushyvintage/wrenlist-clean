/**
 * Skeleton loading primitives.
 *
 * Uses the globally-defined `.skeleton` class from `src/styles/globals.css`
 * which provides a shimmering gradient tuned for cream backgrounds
 * (cream-md → cream-dk). If a skeleton sits on a pure-white panel the
 * contrast may be low — override `background` inline in that case.
 *
 * Wave 1 motion primitive — do NOT redefine the animation here.
 */

import type { CSSProperties, ReactNode } from 'react'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * Plain skeleton box. Accepts className + style so consumers can size it.
 * Example: <Skeleton style={{ width: 120, height: 16 }} />
 */
export function Skeleton({ className = '', style, children }: SkeletonProps) {
  return (
    <div className={`skeleton ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

interface SkeletonLineProps {
  width?: 'sm' | 'md' | 'lg'
  className?: string
}

const LINE_SIZES: Record<NonNullable<SkeletonLineProps['width']>, { w: string; h: number }> = {
  sm: { w: '45%', h: 11 },
  md: { w: '80%', h: 13 },
  lg: { w: '60%', h: 18 },
}

/**
 * Preset-sized skeleton line matching the prototype's `.skel-line-sm/md/lg`.
 * Use inside stacks to mimic headlines, body copy, and labels.
 */
export function SkeletonLine({ width = 'md', className = '' }: SkeletonLineProps) {
  const size = LINE_SIZES[width]
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width: size.w, height: size.h, borderRadius: 2 }}
    />
  )
}

interface SkeletonStatProps {
  className?: string
}

/**
 * 88px tall stat-card sized skeleton — matches prototype `.skel-stat`.
 * Drop into a grid where stat cards will render once loaded.
 */
export function SkeletonStat({ className = '' }: SkeletonStatProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ height: 88, borderRadius: 6 }}
    />
  )
}

interface SkeletonRowProps {
  className?: string
}

/**
 * 46px tall row skeleton — matches prototype `.skel-row`.
 * Ideal for table rows or list items while data loads.
 */
export function SkeletonRow({ className = '' }: SkeletonRowProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ height: 46, borderRadius: 2, marginBottom: 2 }}
    />
  )
}
