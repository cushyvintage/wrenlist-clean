import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'

interface RoadmapCardProps {
  title: string
  desc: string
  votes: number
  tag: string
  featured?: boolean
}

const RoadmapCard = ({ title, desc, votes, tag, featured = false }: RoadmapCardProps) => (
  <div className={`rounded-md p-4 mb-2.5 border transition-all ${
    featured
      ? 'border-[#5a7a57] bg-[#5a7a57]/5'
      : 'border-[rgba(61,92,58,0.14)] bg-white'
  }`}>
    <div className="text-sm font-medium text-[#1e2e1c] mb-1 leading-tight">{title}</div>
    <p className="text-xs font-normal text-[#6b7d6a] leading-relaxed mb-2.5">{desc}</p>
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-[#6b7d6a] bg-[#ede8de] border border-[rgba(61,92,58,0.14)] px-2 py-1 rounded">
        {votes} votes
      </span>
      <span className="text-xs text-[#6b7d6a] bg-[#ede8de] px-2 py-1 rounded">{tag}</span>
    </div>
  </div>
)

export default function RoadmapPage() {
  const consideration = [
    { title: 'Facebook Marketplace integration', desc: 'Crosslist finds to local Facebook Marketplace listings.', votes: 61, tag: 'marketplace' },
    { title: 'Bulk price update across platforms', desc: 'Change asking price on one find and push it to all active listings simultaneously.', votes: 57, tag: 'listings' },
    { title: 'Scheduled relisting', desc: 'Auto-relist unsold finds after X days to refresh their position in search results.', votes: 43, tag: 'automation' },
    { title: 'Vinted Pro / Business account support', desc: 'Specific support for Vinted Pro seller accounts and their additional features.', votes: 38, tag: 'vinted' },
    { title: 'Native iOS & Android app', desc: 'A dedicated mobile app for logging finds at the rack, beyond the mobile-optimised web version.', votes: 29, tag: 'mobile' },
  ]

  const planned = [
    { title: 'Depop integration', desc: 'List and sync inventory to Depop — popular with Gen Z vintage buyers.', votes: 84, tag: 'marketplace', featured: true },
    { title: 'eBay Simple Delivery support', desc: 'Automatically select eBay\'s Simple Delivery option when listing, reducing friction for new sellers.', votes: 44, tag: 'ebay' },
    { title: 'Shopify collections & tags sync', desc: 'Map Wrenlist categories to Shopify collections and auto-tag products on publish.', votes: 31, tag: 'shopify' },
    { title: 'Wren AI listing improvements', desc: 'Better category-specific prompts, brand recognition, and condition language for AI-generated listings.', votes: 27, tag: 'ai' },
    { title: 'Price drop automation', desc: 'Auto-reduce asking price by X% after Y days without a sale, across all platforms.', votes: 19, tag: 'automation' },
  ]

  const inProgress = [
    { title: 'Mobile add-find (full flow)', desc: 'Complete mobile-optimised add-find experience with photo capture, barcode scan, and instant crosslist from your phone at the rack.', votes: 142, tag: 'mobile' },
    { title: 'Sourcing analytics', desc: 'Deep analytics on which sourcing locations (charity shops, car boots, house clearances) give you the best ROI and sell-through rates.', votes: 98, tag: 'analytics' },
    { title: 'Wren AI pricing engine v2', desc: 'Smarter comp pricing that shows sold comps, not just list prices, for more accurate price suggestions across all platforms.', votes: 76, tag: 'ai' },
  ]

  const released = [
    'Vinted integration',
    'eBay UK integration',
    'Etsy integration',
    'Shopify integration',
    'AI listing writer (Wren AI)',
    'Auto-delist on sale',
    'Bulk actions (relist, reprice)',
    'Cost & margin tracking',
    'Sourcing log',
    'Revenue analytics',
    'Background removal',
    'ISBN barcode lookup',
  ]

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      {/* HEADER */}
      <div className="bg-white border-b border-[rgba(61,92,58,0.14)] px-5 sm:px-10 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
            <div>
              <h1 className="hero-fade-1 font-serif text-3xl font-normal text-[#1e2e1c] mb-1">
                What we&apos;re <em className="italic">building.</em>
              </h1>
              <p className="hero-fade-2 text-sm font-normal text-[#6b7d6a]">See what&apos;s shipped, what&apos;s in progress, and what&apos;s coming next.</p>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN HEADERS */}
      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 sm:px-10 py-7 max-w-5xl mx-auto">
        <div className="text-xs font-medium uppercase text-purple-600 flex items-center gap-1">
          Under consideration <strong>{consideration.length}</strong>
        </div>
        <div className="text-xs font-medium uppercase text-blue-600 flex items-center gap-1">
          Planned <strong>{planned.length}</strong>
        </div>
        <div className="text-xs font-medium uppercase text-amber-600 flex items-center gap-1">
          In progress <strong>{inProgress.length}</strong>
        </div>
        <div className="text-xs font-medium uppercase text-green-600 flex items-center gap-1">
          Released <strong>{released.length}</strong>
        </div>
      </Reveal>

      {/* CONTENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-5 sm:px-10 py-8 max-w-5xl mx-auto">

        {/* CONSIDERATION */}
        <div>
          {consideration.map((item, i) => (
            <RoadmapCard key={i} {...item} />
          ))}
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
              <div className="text-sm font-medium text-[#1e2e1c] mb-0.5">{title}</div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-xs font-medium text-[#5a7a57]">✓ Released</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
