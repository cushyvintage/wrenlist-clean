'use client'

import Link from 'next/link'
import { useState } from 'react'

const PricingCard = ({ tier, price, description, limit, features, featured = false }: any) => (
  <div className={`rounded-lg border p-6 flex flex-col ${featured ? 'border-sage bg-opacity-5 bg-sage relative' : 'border-[rgba(61,92,58,0.14)] bg-cream'}`}>
    {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-10px font-semibold uppercase bg-sage-pale text-sage px-2 py-1 rounded">most popular</div>}
    <div className={`text-sm font-medium text-ink mb-4 ${featured ? 'pt-4' : ''}`}>{tier}</div>
    <div className="flex items-baseline gap-1 mb-2">
      <span className="text-sm font-light text-ink-lt">£</span>
      <span className="font-serif text-3xl font-medium text-ink">{price}</span>
      <span className="text-sm font-light text-ink-lt">/mo</span>
    </div>
    <p className="text-sm font-light text-ink-lt mb-6 h-10">{description}</p>
    <div className="mb-6">
      <div className="text-2xl font-serif font-medium text-ink">{limit}</div>
      <div className="text-10px font-semibold uppercase text-sage-dim">finds / month</div>
    </div>
    <a href="/register" className="w-full block text-center rounded bg-sage text-cream py-2.5 text-xs font-medium mb-6 hover:bg-sage-dk">Get started</a>
    <div className="border-t border-[rgba(61,92,58,0.14)] pt-6 mb-4">
      <div className="text-10px font-semibold uppercase text-sage-dim mb-4">includes</div>
      <div className="space-y-3">
        {features.map((feat: string, i: number) => (
          <div key={i} className="flex gap-2 items-start text-sm">
            <span className="text-sage flex-shrink-0">✓</span>
            <span className="text-ink-lt font-light">{feat}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  const plans = [
    {
      tier: 'Free',
      price: '0',
      monthlyPrice: 0,
      description: 'Try Wrenlist with no commitment.',
      limit: '10',
      featured: false,
      features: ['Inventory tracker', '1 marketplace', 'Basic analytics'],
    },
    {
      tier: 'Nester',
      price: annual ? '134' : '14',
      monthlyPrice: 14,
      description: 'For casual thrifters listing regularly.',
      limit: '100',
      featured: false,
      features: ['Everything in Free', '3 marketplaces', 'Crosslisting', 'Auto-delist on sale', 'Sales tracking'],
    },
    {
      tier: 'Forager',
      price: annual ? '290' : '29',
      monthlyPrice: 29,
      description: 'For serious resellers building a real business.',
      limit: '500',
      featured: true,
      features: ['Everything in Nester', 'All 5 marketplaces', 'AI listing generator', 'Bulk actions', 'Price suggestions', 'Unlimited BG removal', 'Full analytics'],
    },
    {
      tier: 'Flock',
      price: annual ? '590' : '59',
      monthlyPrice: 59,
      description: 'For high-volume sellers and small teams.',
      limit: 'Unlimited',
      featured: false,
      features: ['Everything in Forager', '3 team seats', 'Sourcing analytics', 'Priority support', 'API access', 'Custom Shopify storefront'],
    },
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* NAV */}
      <nav className="sticky top-0 z-100 flex items-center justify-between border-b border-[rgba(61,92,58,0.14)] bg-cream pl-6 sm:pl-10 pr-6 sm:pr-12 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/wrenlist-logo.png" alt="Wrenlist" width={36} height={36} className="rounded-sm flex-shrink-0" style={{ mixBlendMode: 'multiply' }} />
          <div className="font-serif text-xl font-medium tracking-wider text-ink">
            WREN<em className="font-light italic text-sage-lt">list</em>
          </div>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/landing" className="text-xs font-light text-ink-lt hover:text-ink">home</Link>
          <div className="text-xs font-medium text-ink">pricing</div>
          <Link href="/about" className="text-xs font-light text-ink-lt hover:text-ink">why wrenlist</Link>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0">
          <a href="/login" className="border border-[rgba(61,92,58,0.22)] rounded text-xs font-light text-ink-lt px-4 py-2 hover:bg-cream-md hover:text-ink">log in</a>
          <a href="/register" className="bg-sage text-cream rounded text-xs font-medium px-4 py-2 hover:bg-sage-dk whitespace-nowrap">start free</a>
        </div>
      </nav>

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

        {/* BILLING TOGGLE */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <button onClick={() => setAnnual(false)} className={`text-xs font-medium ${!annual ? 'text-ink' : 'text-ink-lt'}`}>Monthly</button>
          <div onClick={() => setAnnual(!annual)} className="w-10 h-6 rounded-full bg-sage-pale flex items-center cursor-pointer">
            <div className={`w-5 h-5 rounded-full bg-sage transition-transform ${annual ? 'translate-x-4.5' : 'translate-x-0.5'}`}></div>
          </div>
          <button onClick={() => setAnnual(true)} className={`text-xs font-medium ${annual ? 'text-ink' : 'text-ink-lt'}`}>Annual</button>
          {annual && <span className="text-10px font-medium text-sage-lt bg-sage-pale px-2 py-1 rounded">2 months free</span>}
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-4 gap-6 mb-12 pt-4">
          {plans.map((plan, i) => (
            <PricingCard key={i} {...plan} />
          ))}
        </div>

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
