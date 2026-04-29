'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Top-level items always visible on desktop. The remaining items live in a
// "Resources" dropdown so the marketing nav doesn't dilute attention away
// from the waitlist CTA on the right.
const primaryNavItems = [
  { href: '/landing', label: 'home' },
  { href: '/pricing', label: 'pricing' },
  { href: '/about', label: 'why wrenlist' },
  { href: '/extension', label: 'extension' },
] as const

const resourcesNavItems = [
  { href: '/calculator', label: 'fee calculator' },
  { href: '/tax-estimator', label: 'tax estimator' },
  { href: '/blog', label: 'blog' },
  { href: '/roadmap', label: 'roadmap' },
] as const

// Mobile hamburger keeps the flat list — no nested submenu on phones.
const mobileNavItems = [...primaryNavItems, ...resourcesNavItems]

export function MarketingNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const resourcesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // Click outside closes the desktop Resources dropdown.
  useEffect(() => {
    if (!resourcesOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [resourcesOpen])

  const resourcesActive = resourcesNavItems.some((item) => pathname === item.href)

  return (
    <nav
      className={`topnav sticky top-0 z-50 border-b border-[rgba(61,92,58,0.14)] bg-[#f5f0e8]${scrolled ? ' scrolled' : ''}`}
    >
      <div className="flex items-center justify-between pl-5 sm:pl-10 pr-5 sm:pr-12 py-4">
        <Link href="/landing" className="nav-logo flex items-center gap-2.5">
          <img
            src="/wrenlist-logo.png"
            alt="Wrenlist"
            width={36}
            height={36}
            className="nav-logo-mark rounded-sm flex-shrink-0"
            style={{ mixBlendMode: 'multiply' }}
          />
          <div className="font-serif text-xl font-medium tracking-wider text-[#1e2e1c]">
            WREN<em className="font-light italic text-[#527050]">list</em>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {primaryNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs ${isActive ? 'font-medium text-[#1e2e1c]' : 'font-light text-[#4a6147] hover:text-[#1e2e1c]'}`}
              >
                {item.label}
              </Link>
            )
          })}

          {/* Resources dropdown */}
          <div className="relative" ref={resourcesRef}>
            <button
              type="button"
              onClick={() => setResourcesOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={resourcesOpen}
              className={`flex items-center gap-1 text-xs ${resourcesActive ? 'font-medium text-[#1e2e1c]' : 'font-light text-[#4a6147] hover:text-[#1e2e1c]'}`}
            >
              resources
              <svg
                width="9"
                height="9"
                viewBox="0 0 9 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className={`transition-transform ${resourcesOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 3.5L4.5 6L7 3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {resourcesOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-[170px] rounded-md border border-[rgba(61,92,58,0.18)] bg-[#f5f0e8] shadow-sm py-1.5">
                {resourcesNavItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setResourcesOpen(false)}
                      className={`block px-4 py-2 text-xs ${isActive ? 'font-medium text-[#1e2e1c] bg-[#ede8de]' : 'font-light text-[#4a6147] hover:text-[#1e2e1c] hover:bg-[#ede8de]'}`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center flex-shrink-0">
          <a
            href="/login"
            className="hidden sm:block border border-[rgba(61,92,58,0.3)] rounded text-xs font-medium text-[#1e2e1c] px-4 py-2 hover:bg-[#ede8de] transition-colors"
          >
            log in
          </a>
          <a
            href="/?waitlist=1"
            className="bg-[#3d5c3a] text-[#f5f0e8] rounded text-xs font-medium px-4 py-2 hover:bg-[#2c4428] whitespace-nowrap"
          >
            join waitlist
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden ml-2 p-2 text-[#1e2e1c]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown — flat list, no nested submenu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(61,92,58,0.14)] bg-[#f5f0e8] px-5 py-4 space-y-3">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm ${isActive ? 'font-medium text-[#1e2e1c]' : 'font-light text-[#4a6147]'}`}
              >
                {item.label}
              </Link>
            )
          })}
          <a
            href="/login"
            className="block text-sm font-medium text-[#1e2e1c] border-t border-[rgba(61,92,58,0.14)] pt-3 mt-2 sm:hidden"
          >
            log in
          </a>
        </div>
      )}
    </nav>
  )
}
