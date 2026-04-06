'use client'

import Link from 'next/link'
import { useState } from 'react'

const RoadmapCard = ({ title, desc, votes, tag, featured = false }: any) => (
  <div className={`rounded-md p-4 mb-2.5 cursor-pointer border transition-all ${
    featured
      ? 'border-sage bg-opacity-5 bg-sage'
      : 'border-[rgba(61,92,58,0.14)] bg-white hover:border-sage-dim'
  }`}>
    {featured && (
      <div className="text-10px font-semibold uppercase mb-1 text-sage flex items-center gap-1.5">
        <span>API pending</span>
      </div>
    )}
    <div className="text-sm font-medium text-ink mb-1 leading-tight">{title}</div>
    <p className="text-10px font-light text-ink-lt leading-relaxed mb-2.5">{desc}</p>
    <div className="flex items-center justify-between">
      <button className="text-10px font-medium text-ink-lt bg-cream-md border border-[rgba(61,92,58,0.14)] px-2 py-1 rounded hover:bg-sage-pale hover:border-sage-lt hover:text-sage-dk">
        👆 {votes}
      </button>
      <span className="text-10px text-ink-lt bg-cream-md px-2 py-1 rounded">{tag}</span>
    </div>
  </div>
)

export default function RoadmapPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const consideration = [
    { title: 'Depop integration', desc: 'List and sync inventory to Depop — popular with Gen Z vintage buyers.', votes: 84, tag: 'marketplace' },
    { title: 'Facebook Marketplace integration', desc: 'Crosslist finds to local Facebook Marketplace listings.', votes: 61, tag: 'marketplace' },
    { title: 'Bulk price update across platforms', desc: 'Change asking price on one find and push it to all active listings simultaneously.', votes: 57, tag: 'listings' },
    { title: 'Scheduled relisting', desc: 'Auto-relist unsold finds after X days to refresh their position in search results.', votes: 43, tag: 'automation' },
    { title: 'Vinted Pro / Business account support', desc: 'Specific support for Vinted Pro seller accounts and their additional features.', votes: 38, tag: 'vinted' },
    { title: 'Native iOS & Android app', desc: 'A dedicated mobile app for logging finds at the rack, beyond the mobile-optimised web version.', votes: 29, tag: 'mobile' },
  ]

  const planned = [
    { title: 'Etsy integration', desc: 'Full Etsy listing, sync, and auto-delist support. We\'re in the Etsy API registration process — this is our next major marketplace.', votes: 218, tag: 'marketplace', featured: true },
    { title: 'eBay Simple Delivery support', desc: 'Automatically select eBay\'s Simple Delivery option when listing, reducing friction for new sellers.', votes: 44, tag: 'ebay' },
    { title: 'Shopify collections & tags sync', desc: 'Map Wrenlist categories to Shopify collections and auto-tag products on publish.', votes: 31, tag: 'shopify' },
    { title: 'Wren AI listing improvements', desc: 'Better category-specific prompts, brand recognition, and condition language for AI-generated listings.', votes: 27, tag: 'ai' },
    { title: 'Price drop automation', desc: 'Auto-reduce asking price by X% after Y days without a sale, across all platforms.', votes: 19, tag: 'automation' },
  ]

  const inProgress = [
    { title: 'Mobile add-find (full flow)', desc: 'Complete mobile-optimised add-find experience with photo capture, barcode scan, and instant crosslist from your phone at the rack.', votes: 142, tag: 'mobile', inProgress: true },
    { title: 'Sourcing analytics', desc: 'Deep analytics on which sourcing locations (charity shops, car boots, house clearances) give you the best ROI and sell-through rates.', votes: 98, tag: 'analytics', inProgress: true },
    { title: 'Wren AI pricing engine v2', desc: 'Smarter comp pricing that shows sold comps, not just list prices, for more accurate price suggestions across all platforms.', votes: 76, tag: 'ai', inProgress: true },
  ]

  const released = [
    'Vinted integration',
    'eBay UK integration',
    'Shopify integration',
    'AI listing writer (Wren AI)',
    'Auto-delist on sale',
    'Bulk actions (relist, reprice)',
    'Cost & margin tracking',
    'Sourcing log',
    'Revenue analytics',
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* NAV */}
      <nav className="sticky top-0 z-100 flex items-center justify-between border-b border-[rgba(61,92,58,0.14)] bg-cream px-10 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 flex-shrink-0 bg-sage"></div>
          <div className="font-serif text-xl font-medium tracking-wider text-ink">
            WREN<em className="font-light italic text-sage-lt">list</em>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/landing" className="text-xs font-light text-ink-lt hover:text-ink">home</Link>
          <Link href="/pricing" className="text-xs font-light text-ink-lt hover:text-ink">pricing</Link>
          <div className="text-xs font-medium text-ink">roadmap</div>
        </div>
        <div className="flex gap-2 items-center">
          <a href="/login" className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink">log in</a>
          <a href="/register" className="bg-sage text-cream rounded text-xs font-medium px-4.5 py-2 hover:bg-sage-dk">start free</a>
        </div>
      </nav>

      {/* HEADER */}
      <div className="bg-white border-b border-[rgba(61,92,58,0.14)] px-10 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-5 mb-6">
            <div>
              <h1 className="font-serif text-3xl font-light text-ink mb-1">
                What we're <em className="italic">building.</em>
              </h1>
              <p className="text-sm font-light text-ink-lt">Upvote features to influence what ships next. Sign in to suggest your own.</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 border border-[rgba(61,92,58,0.14)] rounded-md px-3.5 py-2">
                <span className="text-xs text-ink-lt">🔍</span>
                <input
                  type="text"
                  placeholder="Search features…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs bg-transparent border-none outline-none flex-1 text-ink placeholder-ink-lt"
                />
              </div>
              <button className="bg-sage text-cream rounded text-xs font-medium px-4 py-2 hover:bg-sage-dk">+ Suggest a feature</button>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN HEADERS */}
      <div className="grid grid-cols-4 gap-4 px-10 py-7 max-w-5xl mx-auto">
        <div className="text-10px font-semibold uppercase text-purple-600 flex items-center gap-1">
          ◈ Under consideration <strong>12</strong>
        </div>
        <div className="text-10px font-semibold uppercase text-blue-600 flex items-center gap-1">
          ▷ Planned <strong>5</strong>
        </div>
        <div className="text-10px font-semibold uppercase text-amber-600 flex items-center gap-1">
          ⚡ In progress <strong>3</strong>
        </div>
        <div className="text-10px font-semibold uppercase text-green-600 flex items-center gap-1">
          ✓ Released <strong>{released.length}</strong>
        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-4 gap-4 px-10 py-8 max-w-5xl mx-auto">

        {/* CONSIDERATION */}
        <div>
          {consideration.map((item, i) => (
            <RoadmapCard key={i} {...item} />
          ))}
          <div className="border border-dashed border-[rgba(61,92,58,0.22)] rounded-md p-4 text-center cursor-pointer hover:border-sage-dim transition-colors">
            <p className="text-10px text-ink-lt font-light mb-1">Have an idea?</p>
            <p className="text-10px text-sage-lt font-medium">+ Suggest a feature →</p>
          </div>
        </div>

        {/* PLANNED */}
        <div>
          {planned.map((item, i) => (
            <RoadmapCard key={i} {...item} />
          ))}
        </div>

        {/* IN PROGRESS */}
        <div>
          {inProgress.map((item, i) => (
            <RoadmapCard key={i} {...item} />
          ))}
        </div>

        {/* RELEASED */}
        <div>
          {released.map((title, i) => (
            <div key={i} className="rounded-md p-4 mb-2.5 border border-[rgba(61,92,58,0.14)] bg-white">
              <div className="text-sm font-medium text-ink mb-0.5">{title}</div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-10px font-medium text-sage">✓ Released</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-cream px-12 py-16 mt-16">
        <div className="grid grid-cols-4 gap-12 max-w-5xl mx-auto mb-12">
          <div>
            <div className="font-serif text-xl font-medium mb-3">
              WREN<em className="italic font-light text-sage-lt">list</em>
            </div>
            <p className="text-sm font-light text-cream mb-4">The operating system for UK thrifters and resellers.</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Platform</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Pricing</a>
              <a href="#">Why Wrenlist</a>
              <a href="#">Marketplaces</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Resources</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Blog</a>
              <a href="#">Changelog</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Company</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <Link href="/story">Our story</Link>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
