'use client'

import { useState } from 'react'

interface PricingCardProps {
  tier: string
  price: string
  description: string
  limit: string
  features: string[]
  featured?: boolean
}

const PricingCard = ({ tier, price, description, limit, features, featured = false }: PricingCardProps) => (
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
        {features.map((feat, i) => (
          <div key={i} className="flex gap-2 items-start text-sm">
            <span className="text-sage flex-shrink-0">✓</span>
            <span className="text-ink-lt font-light">{feat}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  const plans = [
    {
      tier: 'Free',
      price: '0',
      description: 'Try Wrenlist with no commitment.',
      limit: '10',
      featured: false,
      features: ['Inventory tracker', '1 marketplace', 'Basic analytics'],
    },
    {
      tier: 'Nester',
      price: annual ? '134' : '14',
      description: 'For casual thrifters listing regularly.',
      limit: '100',
      featured: false,
      features: ['Everything in Free', '3 marketplaces', 'Crosslisting', 'Auto-delist on sale', 'Sales tracking'],
    },
    {
      tier: 'Forager',
      price: annual ? '290' : '29',
      description: 'For serious resellers building a real business.',
      limit: '500',
      featured: true,
      features: ['Everything in Nester', 'All 5 marketplaces', 'AI listing generator', 'Bulk actions', 'Price suggestions', 'Unlimited BG removal', 'Full analytics'],
    },
    {
      tier: 'Flock',
      price: annual ? '590' : '59',
      description: 'For high-volume sellers and small teams.',
      limit: 'Unlimited',
      featured: false,
      features: ['Everything in Forager', '3 team seats', 'Sourcing analytics', 'Priority support', 'API access', 'Custom Shopify storefront'],
    },
  ]

  return (
    <>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 pt-4">
        {plans.map((plan, i) => (
          <PricingCard key={i} {...plan} />
        ))}
      </div>
    </>
  )
}
