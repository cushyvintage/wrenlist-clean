// lib/stripe/plans.ts
// Single source of truth for all plan configuration

export type PlanId = 'free' | 'nester' | 'forager' | 'flock'

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  monthlyPrice: number
  annualPrice: number      // total annual charge
  annualMonthlyEquiv: number // monthly equivalent when billed annually
  findsPerMonth: number | null // null = unlimited
  featured?: boolean
  features: {
    label: string
    included: boolean
    detail?: string
  }[]
  stripePriceIds: {
    monthly: string | null
    annual: string | null
  }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try Wrenlist with no commitment. Log your first finds and see how it works.',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthlyEquiv: 0,
    findsPerMonth: 10,
    stripePriceIds: { monthly: null, annual: null },
    features: [
      { label: 'Inventory tracker', included: true },
      { label: '1 marketplace', included: true },
      { label: 'Basic analytics', included: true },
      { label: 'Crosslisting', included: false },
      { label: 'Auto-delist on sale', included: false },
      { label: 'AI listings', included: false },
    ],
  },
  {
    id: 'nester',
    name: 'Nester',
    tagline: 'For casual thrifters listing regularly across a couple of platforms.',
    monthlyPrice: 14,
    annualPrice: 117,
    annualMonthlyEquiv: 9.75,
    findsPerMonth: 100,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_NESTER_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_NESTER_ANNUAL ?? '',
    },
    features: [
      { label: '3 marketplaces', included: true },
      { label: 'Crosslisting', included: true },
      { label: 'Auto-delist on sale', included: true },
      { label: 'Sales tracking', included: true },
      { label: 'AI listing generator', included: false },
      { label: 'Bulk actions', included: false },
    ],
  },
  {
    id: 'forager',
    name: 'Forager',
    tagline: 'For serious resellers building a real business across all UK platforms.',
    monthlyPrice: 29,
    annualPrice: 242,
    annualMonthlyEquiv: 20.17,
    findsPerMonth: 500,
    featured: true,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FORAGER_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FORAGER_ANNUAL ?? '',
    },
    features: [
      { label: 'All 5 marketplaces', included: true },
      { label: 'AI listing generator', included: true },
      { label: 'Bulk actions', included: true },
      { label: 'Price suggestions', included: true },
      { label: 'Unlimited BG removal', included: true },
      { label: 'Full analytics', included: true },
    ],
  },
  {
    id: 'flock',
    name: 'Flock',
    tagline: 'For high-volume sellers and small teams running multi-channel operations.',
    monthlyPrice: 59,
    annualPrice: 492,
    annualMonthlyEquiv: 41,
    findsPerMonth: null,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FLOCK_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FLOCK_ANNUAL ?? '',
    },
    features: [
      { label: '3 team seats', included: true },
      { label: 'Sourcing analytics', included: true },
      { label: 'Priority support', included: true },
      { label: 'API access', included: true },
      { label: 'Custom Shopify storefront', included: true },
      { label: 'Unlimited finds', included: true },
    ],
  },
]

export const PLAN_LIMITS: Record<PlanId, { finds: number | null; marketplaces: number }> = {
  free:    { finds: 10,   marketplaces: 1 },
  nester:  { finds: 100,  marketplaces: 3 },
  forager: { finds: 500,  marketplaces: 5 },
  flock:   { finds: null, marketplaces: 5 },
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find(p => p.id === id)!
}
