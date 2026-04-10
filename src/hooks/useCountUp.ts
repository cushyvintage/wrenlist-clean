'use client'

import { useEffect, useRef, useState } from 'react'

interface UseCountUpOptions {
  /** Animation duration in ms. Defaults to 800. */
  duration?: number
  /** When false, returns the target immediately without animating. */
  enabled?: boolean
  /**
   * If provided, checks sessionStorage[sessionKey]. If set, returns target
   * immediately (animation only plays once per browser session). The key is
   * written after a successful animation run.
   */
  sessionKey?: string
}

/**
 * Counts a number from 0 → target using requestAnimationFrame with a
 * cubic ease-out curve. Respects prefers-reduced-motion and can be gated
 * to once-per-session via sessionKey (matches the prototype's
 * `dashCountedUp` gate).
 *
 * If target changes mid-animation, restarts from the current value so the
 * transition stays smooth.
 *
 * @example
 * const value = useCountUp(stat.value, { sessionKey: "dashCountedUp" })
 */
export function useCountUp(target: number, opts: UseCountUpOptions = {}): number {
  const { duration = 800, enabled = true, sessionKey } = opts

  const [value, setValue] = useState<number>(() => {
    // Initial synchronous decision — avoids a flash of 0 when animation is skipped.
    if (!enabled) return target
    if (typeof window === 'undefined') return target
    if (sessionKey) {
      try {
        if (window.sessionStorage.getItem(sessionKey)) return target
      } catch {
        // sessionStorage can throw in private mode — fall through to animate.
      }
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return target
    return 0
  })

  const rafRef = useRef<number | null>(null)
  const valueRef = useRef<number>(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    if (!enabled) {
      setValue(target)
      return
    }
    if (typeof window === 'undefined') return

    if (sessionKey) {
      try {
        if (window.sessionStorage.getItem(sessionKey)) {
          setValue(target)
          return
        }
      } catch {
        // ignore
      }
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }

    const from = valueRef.current
    const delta = target - from

    // Nothing to animate. Still write the session gate so a brand-new user
    // whose first stat card is 0 doesn't re-trigger the animation wave on
    // their next visit.
    if (delta === 0) {
      if (sessionKey) {
        try {
          window.sessionStorage.setItem(sessionKey, '1')
        } catch {
          // ignore
        }
      }
      return
    }

    const startedAt = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startedAt
      const t = Math.min(1, elapsed / duration)
      // cubic ease-out: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + delta * eased

      if (t >= 1) {
        setValue(target) // snap to exact target for precision on final frame
        rafRef.current = null
        if (sessionKey) {
          try {
            window.sessionStorage.setItem(sessionKey, '1')
          } catch {
            // ignore
          }
        }
        return
      }

      setValue(next)
      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    // We intentionally depend on target/duration/enabled/sessionKey only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, enabled, sessionKey])

  return value
}
