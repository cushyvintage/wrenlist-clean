'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/landing', label: 'home' },
  { href: '/pricing', label: 'pricing' },
  { href: '/about', label: 'why wrenlist' },
  { href: '/calculator', label: 'fee calculator' },
  { href: '/roadmap', label: 'roadmap' },
]

export function MarketingNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgba(61,92,58,0.14)] bg-[#f5f0e8]">
      <div className="flex items-center justify-between pl-5 sm:pl-10 pr-5 sm:pr-12 py-4">
        <Link href="/landing" className="flex items-center gap-2.5">
          <img
            src="/wrenlist-logo.png"
            alt="Wrenlist"
            width={36}
            height={36}
            className="rounded-sm flex-shrink-0"
            style={{ mixBlendMode: 'multiply' }}
          />
          <div className="font-serif text-xl font-medium tracking-wider text-[#1e2e1c]">
            WREN<em className="font-light italic text-[#8a9e88]">list</em>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs ${isActive ? 'font-medium text-[#1e2e1c]' : 'font-light text-[#6b7d6a] hover:text-[#1e2e1c]'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex gap-2 items-center flex-shrink-0">
          <a
            href="/login"
            className="hidden sm:block border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-[#6b7d6a] px-4 py-2 hover:bg-[#ede8de] hover:text-[#1e2e1c]"
          >
            log in
          </a>
          <a
            href="/register"
            className="bg-[#3d5c3a] text-[#f5f0e8] rounded text-xs font-medium px-4 py-2 hover:bg-[#2c4428] whitespace-nowrap"
          >
            start free
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

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[rgba(61,92,58,0.14)] bg-[#f5f0e8] px-5 py-4 space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block text-sm ${isActive ? 'font-medium text-[#1e2e1c]' : 'font-light text-[#6b7d6a]'}`}
              >
                {item.label}
              </Link>
            )
          })}
          <a
            href="/login"
            className="block text-sm font-light text-[#6b7d6a] sm:hidden"
          >
            log in
          </a>
        </div>
      )}
    </nav>
  )
}
