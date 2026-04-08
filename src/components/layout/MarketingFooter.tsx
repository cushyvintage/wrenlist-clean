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
            <Link href="/about" className="hover:text-[#f5f0e8] transition-colors">Why Wrenlist</Link>
            <Link href="/roadmap" className="hover:text-[#f5f0e8] transition-colors">Roadmap</Link>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[#f5f0e8] mb-3">Resources</div>
          <div className="flex flex-col gap-2 text-sm font-normal text-[#7a9a78]">
            <Link href="/blog" className="hover:text-[#f5f0e8] transition-colors">Blog</Link>
            <Link href="/story" className="hover:text-[#f5f0e8] transition-colors">Our story</Link>
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
          <div className="text-xs font-medium uppercase text-[#f5f0e8] mb-3">Contact</div>
          <div className="flex flex-col gap-2 text-sm font-normal text-[#7a9a78]">
            <a href="mailto:admin@wrenlist.com" className="hover:text-[#f5f0e8] transition-colors">admin@wrenlist.com</a>
          </div>
        </div>
      </div>
      <div className="border-t border-opacity-10 border-white pt-6 text-center text-xs font-normal text-[#7a9a78]">
        &copy; {new Date().getFullYear()} Wrenlist. Built by thrifters, for thrifters.
      </div>
    </footer>
  )
}
