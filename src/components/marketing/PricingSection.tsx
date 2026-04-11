'use client'

import { useState } from 'react'
import { Reveal } from '@/components/motion'
import { isFoundingFlockWindow } from '@/config/plans'

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
}

const PricingCard = ({ tier, price, postLaunchPrice, annualMonthly, description, limit, features, featured = false, isAnnual = false, founding = false }: PricingCardProps) => (
  <div className={`plan-card${featured ? ' popular' : ''} rounded-lg border p-6 flex flex-col ${featured ? 'border-[#5a7a57] bg-[#5a7a57]/5 relative' : 'border-[rgba(61,92,58,0.14)] bg-[#f5f0e8] relative'}`}>
    {featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium uppercase bg-[#d4e2d2] text-[#5a7a57] px-2 py-1 rounded">most popular</div>}
    {founding && !featured && price !== '0' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-10px font-semibold uppercase bg-[#e8dcc2] text-[#7a5a2a] px-2 py-1 rounded">founding</div>}
    <div className={`text-sm font-medium text-[#1e2e1c] mb-4 ${featured || (founding && price !== '0') ? 'pt-4' : ''}`}>{tier}</div>
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
    <p className="text-sm font-normal text-[#4a6147] mb-6 h-10">{description}</p>
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
  const founding = isFoundingFlockWindow()

  const plans = [
    {
      tier: 'Free',
      price: '0',
      description: 'Try Wrenlist with no commitment.',
      limit: '25',
      featured: false,
      features: ['Inventory tracker', '1 marketplace', 'Basic analytics'],
    },
    {
      tier: 'Nester',
      price: annual ? '134' : '14',
      annualMonthly: '11',
      postLaunchPrice: '17',
      description: 'For casual thrifters listing regularly.',
      limit: '100',
      featured: false,
      features: ['Everything in Free', '3 marketplaces', 'Crosslisting', 'Auto-delist on sale', 'Sales tracking'],
    },
    {
      tier: 'Flourish',
      price: annual ? '182' : '19',
      annualMonthly: '15',
      postLaunchPrice: '24',
      description: 'For growing resellers scaling past 100 finds.',
      limit: '250',
      featured: false,
      features: ['Everything in Nester', '4 marketplaces', 'AI listing generator', 'Bulk actions'],
    },
    {
      tier: 'Forager',
      price: annual ? '278' : '29',
      annualMonthly: '23',
      postLaunchPrice: '34',
      description: 'For serious resellers building a real business.',
      limit: '500',
      featured: true,
      features: ['Everything in Flourish', 'All marketplaces', 'Price suggestions', 'Unlimited BG removal', 'Full analytics'],
    },
    {
      tier: 'Soar',
      price: annual ? '374' : '39',
      annualMonthly: '31',
      postLaunchPrice: '49',
      description: 'Unlimited finds for solo power-sellers.',
      limit: 'Unlimited',
      featured: false,
      features: ['Everything in Forager', 'Unlimited finds', 'Priority listing queue', 'Priority support'],
    },
  ]

  return (
    <>
      {/* FOUNDING FLOCK BANNER */}
      {founding && (
        <div className="mb-8 text-center">
          <div className="inline-block rounded-full bg-[#e8dcc2] text-[#7a5a2a] px-4 py-2 text-xs font-medium">
            Founding Flock — lock in today's prices for life. Offer ends 30 June 2026.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 pt-4 max-w-6xl mx-auto">
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
