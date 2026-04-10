import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'

const InventoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2" width="12" height="2.5" rx=".8" stroke="#5f7c6b" strokeWidth="1.1"/>
    <rect x="1" y="5.75" width="12" height="2.5" rx=".8" stroke="#5f7c6b" strokeWidth="1.1"/>
    <rect x="1" y="9.5" width="12" height="2.5" rx=".8" stroke="#5f7c6b" strokeWidth="1.1"/>
  </svg>
)

const MarginIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 11L5 8l2.5 2.5L12 4" stroke="#5f7c6b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CrosslistIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="3" cy="7" r="2" stroke="#5f7c6b" strokeWidth="1.1"/>
    <circle cx="11" cy="3" r="2" stroke="#5f7c6b" strokeWidth="1.1"/>
    <circle cx="11" cy="11" r="2" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M5 6.3l4-2.6M5 7.7l4 2.6" stroke="#5f7c6b" strokeWidth="1.1"/>
  </svg>
)

const DelistIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v6M4 4l3 3 3-3" stroke="#5f7c6b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10v1a2 2 0 002 2h6a2 2 0 002-2v-1" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const AIListingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 10l2-2 1.5 1.5L10 4" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 2l1 1-7 7-2 .5.5-2L11 2z" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const PriceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5 5.5 4 7 1z" stroke="#5f7c6b" strokeWidth="1.1" strokeLinejoin="round" fill="none"/>
  </svg>
)

const BackgroundIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2.5" width="11" height="9" rx="1" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M4 6.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M9.5 2.5V1.5M11.5 4.5H12.5" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const BulkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 3h12M1 7h12M1 11h12" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
    <rect x="1" y="1.5" width="3" height="3" rx=".5" fill="#d4e2d2" stroke="#5f7c6b" strokeWidth=".8"/>
  </svg>
)

const SourcingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L1.5 4.5v5L7 13l5.5-3.5v-5L7 1z" stroke="#5f7c6b" strokeWidth="1.1" strokeLinejoin="round"/>
    <path d="M7 7v3M7 4v1.5" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const RevenueIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 11l3-4 2.5 2 5-6" stroke="#5f7c6b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ROIIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 10l3-3 2 2 5-6" stroke="#5f7c6b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 4h2v2" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const InsightsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 2c-2.8 0-5 2.2-5 5 0 1.5.7 2.9 1.7 3.8L7 12l3.3-1.2A5 5 0 007 2z" stroke="#5f7c6b" strokeWidth="1.1" strokeLinejoin="round"/>
    <path d="M5 7h4M7 5v4" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const SKUIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="4" width="8" height="8" rx="1" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M5 4V2.5a2 2 0 014 0V4" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
    <circle cx="5" cy="8" r=".8" fill="#5f7c6b"/>
  </svg>
)

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="5.5" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M7 4v3.5l2 2" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TaxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 2h9a1 1 0 011 1v9a1 1 0 01-1 1h-9a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M4.5 7h5M4.5 9.5h3" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
    <path d="M4.5 4.5h5" stroke="#5f7c6b" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
)

const ResearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke="#5f7c6b" strokeWidth="1.1"/>
    <path d="M9.5 9.5L13 13" stroke="#5f7c6b" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

export default function LandingPage() {
  const features = [
    { icon: InventoryIcon, title: 'Inventory tracker', desc: 'Every find, every status, one place' },
    { icon: MarginIcon, title: 'Cost & margin tracking', desc: 'Margin % on every find, always visible' },
    { icon: CrosslistIcon, title: 'Crosslist to 5 platforms', desc: 'Vinted, eBay, Etsy, Shopify & Depop' },
    { icon: DelistIcon, title: 'Auto-delist on sale', desc: 'Sold on one platform? All others come down' },
    { icon: AIListingIcon, title: 'AI listing writer', desc: 'Wren AI drafts titles & descriptions' },
    { icon: PriceIcon, title: 'Price suggestions', desc: 'Live comp data across UK marketplaces' },
    { icon: BackgroundIcon, title: 'Background removal', desc: 'Unlimited clean product photos, included' },
    { icon: BulkIcon, title: 'Bulk actions', desc: 'Relist, reprice, mark sold in batches' },
    { icon: SourcingIcon, title: 'Sourcing log', desc: 'Track trips, spend & yield by location' },
    { icon: RevenueIcon, title: 'Revenue analytics', desc: '6-month trends, platform breakdown' },
    { icon: ROIIcon, title: 'Source ROI tracking', desc: 'Which hauls make you money' },
    { icon: InsightsIcon, title: 'Wren insights', desc: 'Actionable AI recommendations on your data' },
    { icon: SKUIcon, title: 'SKU management', desc: 'Auto-assigned codes, custom overrides' },
    { icon: HistoryIcon, title: 'Sold history', desc: 'Full timeline of every completed sale' },
    { icon: TaxIcon, title: 'Tax summary export', desc: 'HMRC-ready profit & expense report' },
    { icon: ResearchIcon, title: 'Price research', desc: 'Sold comps from across UK platforms' },
  ]

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      {/* HERO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-[rgba(61,92,58,0.12)]">
        <div className="flex flex-col justify-center px-5 sm:px-8 lg:px-12 py-10 lg:py-16">
          {/* Beta badge */}
          <div className="hero-fade-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3d5c3a]/10 border border-[#3d5c3a]/20 mb-5 w-fit">
            <span className="w-2 h-2 rounded-full bg-[#3d5c3a] animate-pulse" />
            <span className="text-xs font-medium text-[#3d5c3a] uppercase tracking-wider">Open Beta — Free for 3 months</span>
          </div>
          <p className="hero-fade-1 mb-4 text-xs font-medium uppercase tracking-wider text-[#8a9e88]">The thrifter&apos;s operating system</p>
          <h1 className="hero-fade-2 mb-5 font-serif text-[36px] sm:text-[44px] lg:text-[56px] font-normal leading-[1.04] text-[#1e2e1c]">
            Every find,<br />
            <em className="italic text-[#5a7a57]">accounted</em>
            <br />
            for.
          </h1>
          <p className="hero-fade-3 mb-7 max-w-sm font-normal leading-relaxed text-[#6b7d6a]">
            Wrenlist tracks your inventory, prices your pieces, and crosslists to Vinted, eBay, Etsy, Shopify & more — so you can spend more time at the rack.
          </p>
          <div className="hero-fade-4 flex gap-4 items-center">
            <a href="/register" className="bg-[#3d5c3a] text-[#f5f0e8] px-8 py-3 text-xs font-medium uppercase tracking-widest hover:bg-[#2c4428]">
              Start your free beta
            </a>
            <Link href="/pricing" className="text-sm font-normal text-[#5a7a57] underline cursor-pointer hover:text-[#3d5c3a]">
              see pricing →
            </Link>
          </div>
        </div>

        <div className="hero-fade-5 flex flex-col justify-center gap-4 bg-[#ede8de] px-5 sm:px-8 lg:px-10 py-10">
          <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88]">your inventory at a glance</div>

          {/* Inventory Cards */}
          {[
            { name: 'Carhartt Detroit jacket — brown, M', meta: 'workwear · house clearance · cost £12', price: '£145', roi: '+1,108% return', badge: 'listed', badgeBg: '#d4e2d2' },
            { name: 'New Balance 990v3 — grey, 10.5', meta: 'footwear · Salvation Army · cost £8', price: '£210', roi: '+2,525% return', badge: 'on hold', badgeBg: '#d4e2d2' },
            { name: 'Pendleton wool shirt — plaid, L', meta: 'tops · flea market · cost £6', price: '£89', roi: '+1,383% return', badge: 'sold £89', badgeBg: '#d4e2d2' },
          ].map((item, i) => (
            <div key={i} className="rounded border border-[rgba(61,92,58,0.12)] bg-[#f5f0e8] p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-[#1e2e1c]">{item.name}</div>
                <div className="text-xs text-[#8a9e88] mt-1">{item.meta}</div>
                <div className="mt-1.5 flex gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded" style={{backgroundColor: item.badgeBg, color: '#5a7a57'}}>{item.badge}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-serif text-xl font-medium text-[#1e2e1c]">{item.price}</div>
                <div className="text-xs text-[#5a7a57] mt-0.5">{item.roi}</div>
              </div>
            </div>
          ))}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-2">
            {[
              { n: '147', l: 'active finds', up: '+12 this week' },
              { n: '68%', l: 'avg margin', up: 'up from 61%' },
              { n: '£3.2k', l: 'this month', up: '+18%' },
            ].map((stat, i) => (
              <div key={i} className="rounded border border-[rgba(61,92,58,0.12)] bg-[#f5f0e8] p-3 text-center">
                <div className="font-serif text-2xl font-medium text-[#1e2e1c]">{stat.n}</div>
                <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mt-1">{stat.l}</div>
                <div className="text-xs text-[#5a7a57] mt-0.5">{stat.up}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-b border-[rgba(61,92,58,0.12)]">
        {[
          { num: '01', title: 'Log every find instantly', body: 'Snap a photo, enter cost, done. Wrenlist fills in category, condition, and comparable sold prices before you leave the shop floor.' },
          { num: '02', title: 'Price with confidence', body: 'Live comp data from Vinted, eBay, Etsy and more. Know what your piece is worth before you list it, not after it sits for 60 days.' },
          { num: '03', title: 'List everywhere at once', body: 'Cross-post to Vinted, eBay, Etsy, Shopify & more from one screen. When it sells, every other listing comes down automatically.' },
        ].map((feat, i) => (
          <div key={i} className={`px-5 sm:px-10 py-9 ${i < 2 ? 'border-b md:border-b-0 md:border-r border-[rgba(61,92,58,0.12)]' : ''}`}>
            <div className="font-serif text-4xl md:text-5xl text-[#e0d9cc] mb-2.5">{feat.num}</div>
            <div className="text-sm font-medium text-[#1e2e1c] mb-2">{feat.title}</div>
            <div className="text-sm font-normal leading-relaxed text-[#6b7d6a]">{feat.body}</div>
          </div>
        ))}
      </div>

      {/* FEATURES GRID SECTION */}
      <section className="bg-[#f5f0e8] px-5 sm:px-8 lg:px-12 py-12">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mb-12 text-center">
            <div className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#8a9e88]">everything included</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1e2e1c]">
              One product. <em className="italic">Every tool.</em>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-[rgba(61,92,58,0.12)] rounded-lg overflow-hidden">
            {features.map((feat, i) => {
              const Icon = feat.icon
              return (
                <div key={i} className="border-b sm:border-r border-[rgba(61,92,58,0.12)] p-5 flex gap-3 hover:bg-[#f5f0e8] last:border-b-0">
                  <div className="w-8 h-8 bg-[#d4e2d2] rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#1e2e1c] mb-1 leading-snug">{feat.title}</div>
                    <div className="text-xs font-normal text-[#6b7d6a] leading-snug">{feat.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center text-xs text-[#6b7d6a] font-normal mt-5">
            All features included during beta. <Link href="/pricing" className="text-[#5a7a57] underline">See pricing after beta →</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0 border-b border-[rgba(61,92,58,0.12)] bg-[#d4e2d2] px-5 sm:px-8 lg:px-12 py-10 lg:py-12">
        <div>
          <p className="font-serif text-lg sm:text-xl font-normal leading-relaxed text-[#1e2e1c]">
            &ldquo;I used to track everything in a Notes app. Wrenlist made me realise how much money I was leaving at the bottom of the pile.&rdquo;
          </p>
          <p className="mt-4 text-xs text-[#8a9e88]">— Jordan K., full-time reseller · London, UK</p>
        </div>
        <div className="text-center flex flex-col items-center justify-center">
          <div className="font-serif text-4xl sm:text-5xl font-medium text-[#3d5c3a]">68%</div>
          <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mt-2">avg user margin</div>
        </div>
      </Reveal>

      <MarketingFooter />
    </div>
  )
}
