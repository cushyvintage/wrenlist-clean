import Link from 'next/link'

export function MarketingFooter() {
  return (
    <footer className="bg-[#1e2e1c] text-[#7a9a78] px-5 sm:px-8 lg:px-12 py-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 max-w-6xl mx-auto mb-10">
        <div>
          <div className="font-serif text-lg font-medium text-[#f5f0e8] mb-2">
            WREN<em className="italic font-light text-[#5a7a57]">list</em>
          </div>
          <p className="text-sm font-normal text-[#7a9a78] mb-4">The operating system for UK thrifters and resellers.</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[#f5f0e8] mb-3">Platform</div>
          <div className="flex flex-col gap-2 text-sm font-normal text-[#7a9a78]">
            <Link href="/pricing" className="hover:text-[#f5f0e8] transition-colors">Pricing</Link>
            <Link href="/story" className="hover:text-[#f5f0e8] transition-colors">Why Wrenlist</Link>
            <Link href="/roadmap" className="hover:text-[#f5f0e8] transition-colors">Roadmap</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[#f5f0e8] mb-3">Resources</div>
          <div className="flex flex-col gap-2 text-sm font-normal text-[#7a9a78]">
            <Link href="/calculator" className="hover:text-[#f5f0e8] transition-colors">Fee calculator</Link>
            <Link href="/tax-estimator" className="hover:text-[#f5f0e8] transition-colors">Tax estimator</Link>
            <Link href="/marketplace-comparison" className="hover:text-[#f5f0e8] transition-colors">Marketplace guide</Link>
            <Link href="/glossary" className="hover:text-[#f5f0e8] transition-colors">Reseller glossary</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[#f5f0e8] mb-3">Legal</div>
          <div className="flex flex-col gap-2 text-sm font-normal text-[#7a9a78]">
            <Link href="/terms" className="hover:text-[#f5f0e8] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[#f5f0e8] transition-colors">Privacy</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[#f5f0e8] mb-3">Connect</div>
          <div className="flex flex-col gap-2 text-sm font-normal text-[#7a9a78]">
            <a href="mailto:admin@wrenlist.com" className="hover:text-[#f5f0e8] transition-colors">admin@wrenlist.com</a>
            <div className="flex gap-3 mt-1">
              <a href="https://x.com/wrenlistapp" target="_blank" rel="noopener noreferrer" className="hover:text-[#f5f0e8] transition-colors" aria-label="X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://instagram.com/wrenlistapp" target="_blank" rel="noopener noreferrer" className="hover:text-[#f5f0e8] transition-colors" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://reddit.com/user/Left-Professor3753" target="_blank" rel="noopener noreferrer" className="hover:text-[#f5f0e8] transition-colors" aria-label="Reddit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-opacity-10 border-white pt-6 text-center text-xs font-normal text-[#7a9a78] space-y-1">
        <div>&copy; {new Date().getFullYear()} Wrenlist. Built by thrifters, for thrifters.</div>
        <div>Operated by Dominic Cushnan (sole trader) &middot; Registered with the UK ICO</div>
      </div>
    </footer>
  )
}
