'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/landing', label: 'home' },
  { href: '/pricing', label: 'pricing' },
  { href: '/about', label: 'why wrenlist' },
]

export function MarketingNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-100 flex items-center justify-between border-b border-[rgba(61,92,58,0.14)] bg-cream pl-6 sm:pl-10 pr-6 sm:pr-12 py-4">
      <Link href="/landing" className="flex items-center gap-2.5">
        <img
          src="/wrenlist-logo.png"
          alt="Wrenlist"
          width={36}
          height={36}
          className="rounded-sm flex-shrink-0"
          style={{ mixBlendMode: 'multiply' }}
        />
        <div className="font-serif text-xl font-medium tracking-wider text-ink">
          WREN<em className="font-light italic text-sage-lt">list</em>
        </div>
      </Link>

      <div className="flex items-center gap-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs ${isActive ? 'font-medium text-ink' : 'font-light text-ink-lt hover:text-ink'}`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="flex gap-2 items-center flex-shrink-0">
        <a
          href="/login"
          className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink"
        >
          log in
        </a>
        <a
          href="/register"
          className="bg-sage text-cream rounded text-xs font-medium px-4 py-2 hover:bg-sage-dk whitespace-nowrap"
        >
          start free
        </a>
      </div>
    </nav>
  )
}
