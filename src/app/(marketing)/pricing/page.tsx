import Link from 'next/link'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { PricingSection } from '@/components/marketing/PricingSection'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingNav />

      {/* HEADER */}
      <div className="px-12 py-12 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-10px font-medium uppercase tracking-wider text-sage-dim mb-2.5">simple, honest pricing</div>
          <h1 className="font-serif text-3xl font-light text-ink mb-2">
            Built for thrifters.<br />
            <em className="italic">Priced fairly.</em>
          </h1>
          <p className="text-sm font-light text-ink-lt">Vinted, eBay, Etsy & Shopify on every paid plan. No add-ons.</p>
        </div>

        <PricingSection />

        {/* COMPARISON */}
        <div className="mt-16">
          <div className="font-serif text-2xl italic text-ink mb-4">How Wrenlist compares</div>
          <p className="text-sm font-light text-ink-lt mb-6 leading-relaxed">
            Vendoo and Crosslist are solid crosslisting tools. Wrenlist is the full operating system — sourcing, inventory, pricing, crosslisting, and analytics in one place.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(61,92,58,0.14)]">
                  <th className="text-left py-3 font-medium text-ink">Feature</th>
                  <th className="text-center py-3 font-medium text-sage">Wrenlist</th>
                  <th className="text-center py-3 font-medium text-ink-lt">Vendoo</th>
                  <th className="text-center py-3 font-medium text-ink-lt">Crosslist</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feat: 'Entry price (UK)', wr: '£14/mo', other1: '£17/mo', other2: '~£24/mo' },
                  { feat: 'Vinted, eBay, Etsy, Shopify', wr: '✓', other1: '✓', other2: '✓' },
                  { feat: 'AI listings included in base price', wr: '✓ from £29', other1: 'paid add-on', other2: '+£4/mo extra' },
                  { feat: 'Auto-delist on sale', wr: '✓ from £14', other1: '✓', other2: '✓' },
                  { feat: 'Full inventory OS', wr: '✓', other1: '✗', other2: '✗' },
                  { feat: 'Margin & ROI analytics', wr: '✓', other1: 'basic only', other2: '✗' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[rgba(61,92,58,0.14)]">
                    <td className="py-3 text-ink-lt font-light">{row.feat}</td>
                    <td className="text-center py-3 text-sage font-medium">{row.wr}</td>
                    <td className="text-center py-3 text-ink-lt font-light">{row.other1}</td>
                    <td className="text-center py-3 text-ink-lt font-light">{row.other2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-10px text-sage-dim italic mt-4">Pricing comparisons based on publicly available information, March 2026.</p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-ink text-cream px-12 py-16 mt-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 max-w-5xl mx-auto mb-12">
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
              <Link href="/about">Why Wrenlist</Link>
              <a href="#">Marketplaces</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase mb-4">Resources</div>
            <div className="flex flex-col gap-3 text-sm font-light">
              <a href="#">Blog</a>
              <Link href="/roadmap">Roadmap</Link>
              <a href="#">Fee calculator</a>
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
