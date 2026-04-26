import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { PricingSection } from '@/components/marketing/PricingSection'
import { Reveal } from '@/components/motion'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <MarketingNav />

      {/* HEADER */}
      <div className="px-5 sm:px-8 lg:px-12 py-12 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="hero-fade-1 text-xs font-medium uppercase tracking-wider text-sage-dim mb-2.5">simple, honest pricing</div>
          <h1 className="hero-fade-2 font-serif text-3xl font-normal text-ink mb-2">
            Built for thrifters.<br />
            <em className="italic">Priced fairly.</em>
          </h1>
          <p className="hero-fade-3 text-sm font-normal text-ink-lt">Every supported marketplace on every paid plan. No add-ons.</p>
        </div>

        <PricingSection />

        {/* COMPARISON */}
        <Reveal className="mt-16">
          <div className="font-serif text-2xl italic text-ink mb-4">How Wrenlist compares</div>
          <p className="text-sm font-normal text-ink-lt mb-6 leading-relaxed">
            Vendoo and Crosslist are solid crosslisting tools. Wrenlist is the full operating system — sourcing, inventory, pricing, crosslisting, and analytics in one place.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(61,92,58,0.14)]">
                  <th className="text-left py-3 font-medium text-ink">Feature</th>
                  <th className="text-center py-3 font-medium text-sage-lt">Wrenlist</th>
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
                    <td className="py-3 text-ink-lt font-normal">{row.feat}</td>
                    <td className="text-center py-3 text-sage-lt font-medium">{row.wr}</td>
                    <td className="text-center py-3 text-ink-lt font-normal">{row.other1}</td>
                    <td className="text-center py-3 text-ink-lt font-normal">{row.other2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-sage-dim italic mt-4">Pricing comparisons based on publicly available information, April 2026.</p>
        </Reveal>
      </div>

      <MarketingFooter />
    </div>
  )
}
