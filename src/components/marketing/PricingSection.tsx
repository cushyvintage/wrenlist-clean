'use client'

import { useState } from 'react'
import { Reveal } from '@/components/motion'
import { isFoundingFlockWindow } from '@/config/plans'
import { trackEvent } from '@/lib/plausible'

interface PricingCardProps {
  tier: string
  price: string
  postLaunchPrice?: string
  annualMonthly?: string
  description: string
  limit: string
  features: string[]
  featured?: boolean
  isAnnual?: boolean
  founding?: boolean
  ctaLabel?: string
}

const PricingCard = ({ tier, price, postLaunchPrice, annualMonthly, description, limit, features, featured = false, isAnnual = false, founding = false, ctaLabel = 'Join the waitlist' }: PricingCardProps) => {
  const handleCtaClick = () => {
    trackEvent('PricingCTAClicked', { tier })
  }

  return (
  <div className={`plan-card${featured ? ' popular' : ''} rounded-lg border p-6 flex flex-col ${featured ? 'border-[#5a7a57] bg-[#5a7a57]/5 relative' : 'border-[rgba(61,92,58,0.14)] bg-[#f5f0e8] relative'}`}>
    {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium uppercase bg-[#d4e2d2] text-[#5a7a57] px-2 py-1 rounded">most popular</div>}
    {founding && featured && <div className="absolute -top-3 right-4 whitespace-nowrap text-10px font-semibold uppercase bg-[#e8dcc2] text-[#7a5a2a] px-2 py-1 rounded">founding</div>}
    <div className={`text-sm font-medium text-[#1e2e1c] mb-4 ${featured ? 'pt-4' : ''}`}>{tier}</div>
    <div className="flex items-baseline gap-1 mb-1">
      <span className="text-sm font-normal text-[#4a6147]">£</span>
      <span className="font-serif text-3xl font-medium text-[#1e2e1c]">{isAnnual && annualMonthly ? annualMonthly : price}</span>
      <span className="text-sm font-normal text-[#4a6147]">/mo</span>
    </div>
    {isAnnual && annualMonthly && price !== '0' && (
      <div className="text-xs text-[#527050] mb-2">£{price} billed annually</div>
    )}
    {founding && postLaunchPrice && price !== '0' && !isAnnual && (
      <div className="text-10px text-[#a08050] mb-2 whitespace-nowrap">Normally £{postLaunchPrice}/mo</div>
    )}
    <p className="text-sm font-normal text-[#4a6147] mb-6 min-h-[2.5rem]">{description}</p>
    <div className="mb-6">
      <div className="text-2xl font-serif font-medium text-ink">{limit}</div>
      <div className="text-10px font-semibold uppercase text-sage-dim">finds / month</div>
    </div>
    <a href="/?waitlist=1" onClick={handleCtaClick} className="w-full block text-center rounded bg-sage text-cream py-2.5 text-xs font-medium mb-6 hover:bg-sage-dk">{ctaLabel}</a>
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
}

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const founding = isFoundingFlockWindow()

  const plans = [
    {
      tier: 'Free',
      price: '0',
      description: 'Log up to 25 finds a month. Every marketplace included.',
      limit: '25',
      featured: false,
      ctaLabel: 'Start free',
      features: [
        'Every supported marketplace',
        'Crosslisting + auto-delist',
        'Inventory tracker',
        'Sales tracking',
        'No credit card required',
      ],
    },
    {
      tier: 'Flock',
      price: annual ? '134' : '14',
      annualMonthly: '11',
      postLaunchPrice: '24',
      description: 'Unlimited finds for serious resellers. Every feature unlocked.',
      limit: 'Unlimited',
      featured: true,
      ctaLabel: 'Join the waitlist',
      features: [
        'Everything in Free',
        'Unlimited finds',
        'AI listing generator',
        'Bulk actions',
        'Price suggestions',
        'Full margin & ROI analytics',
        'Priority support',
      ],
    },
  ]

  return (
    <>
      {/* FOUNDING FLOCK BANNER */}
      {founding && (
        <div className="mb-8 text-center">
          <div className="inline-block rounded-full bg-[#e8dcc2] text-[#7a5a2a] px-4 py-2 text-xs font-medium">
            Founding Flock — lock in founder pricing at £14/mo. Offer ends 30 June 2026.
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12 pt-4 max-w-3xl mx-auto">
        {plans.map((plan, i) => {
          const delay = ((i % 4) + 1) as 1 | 2 | 3 | 4
          return (
            <Reveal key={i} delay={delay}>
              <PricingCard {...plan} isAnnual={annual} founding={founding} />
            </Reveal>
          )
        })}
      </div>
    </>
  )
}
