'use client'

import { useEffect, useRef, type HTMLAttributes, type JSX } from 'react'

type RevealDelay = 1 | 2 | 3 | 4

interface RevealProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  delay?: RevealDelay
  as?: keyof JSX.IntrinsicElements
}

/**
 * Scroll-reveal wrapper. Renders its children with the `reveal` class so SSR
 * paints the pre-reveal state, then an IntersectionObserver adds `is-visible`
 * the first time the element enters the viewport and unobserves itself.
 *
 * Pair with the `.reveal` / `.reveal-delay-N` utilities in globals.css.
 */
export function Reveal({
  children,
  delay,
  as = 'div',
  className,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12 }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [])

  const classes = [
    'reveal',
    delay ? `reveal-delay-${delay}` : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const Tag = as as 'div'
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={classes}
      {...rest}
    >
      {children}
    </Tag>
  )
}
