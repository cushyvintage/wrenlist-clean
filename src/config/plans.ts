// lib/stripe/plans.ts
// Single source of truth for all plan configuration

export type PlanId = 'free' | 'flock'

/**
 * Founding Flock pricing window.
 *
 * Sellers who sign up before FOUNDING_FLOCK_DEADLINE lock in the
 * `monthlyPrice` / `annualPrice` shown here FOR LIFE. After the deadline,
 * new sign-ups see the `postLaunchMonthlyPrice` / `postLaunchAnnualPrice`.
 */
export const FOUNDING_FLOCK_DEADLINE = new Date('2026-06-30T23:59:59Z')
export const isFoundingFlockWindow = () => new Date() < FOUNDING_FLOCK_DEADLINE

/**
 * Open beta window. While active: plan limits are announced but not enforced,
 * and UI surfaces that ask users to "upgrade" should be hidden. After this
 * date, usage counters and blocks kick in.
 */
export const BETA_ENDS = new Date('2026-06-30T23:59:59Z')
export const isBetaActive = () => new Date() < BETA_ENDS

export interface Plan {
  id: PlanId
  name: string
  tagline: string
  monthlyPrice: number
  annualPrice: number
  annualMonthlyEquiv: number
  postLaunchMonthlyPrice?: number
  postLaunchAnnualPrice?: number
  findsPerMonth: number | null // null = unlimited
  marketplaces: number | null  // null = all (always null in v2 — every plan gets every marketplace)
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
    tagline: 'Log up to 25 finds a month. Every marketplace included. No credit card.',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthlyEquiv: 0,
    findsPerMonth: 25,
    marketplaces: null,
    stripePriceIds: { monthly: null, annual: null },
    features: [
      { label: '25 finds / month', included: true },
      { label: 'Every supported marketplace', included: true },
      { label: 'Crosslisting + auto-delist', included: true },
      { label: 'Inventory tracker', included: true },
      { label: 'Sales tracking', included: true },
    ],
  },
  {
    id: 'flock',
    name: 'Flock',
    tagline: 'Unlimited finds for serious resellers. Every marketplace, every feature.',
    monthlyPrice: 14,
    annualPrice: 134,
    annualMonthlyEquiv: 11,
    postLaunchMonthlyPrice: 24,
    postLaunchAnnualPrice: 230,
    findsPerMonth: null,
    marketplaces: null,
    featured: true,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FLOCK_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FLOCK_ANNUAL ?? '',
    },
    features: [
      { label: 'Unlimited finds', included: true },
      { label: 'Every supported marketplace', included: true },
      { label: 'Crosslisting + auto-delist', included: true },
      { label: 'AI listing generator', included: true },
      { label: 'Bulk actions', included: true },
      { label: 'Price suggestions', included: true },
      { label: 'Full margin & ROI analytics', included: true },
      { label: 'Priority support', included: true },
    ],
  },
]

export const PLAN_LIMITS: Record<PlanId, { finds: number | null; marketplaces: number | null }> = {
  free:  { finds: 25,   marketplaces: null },
  flock: { finds: null, marketplaces: null },
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find(p => p.id === id)!
}

export function getFindsLimit(planId: PlanId): number | null {
  return PLAN_LIMITS[planId]?.finds ?? null
}
