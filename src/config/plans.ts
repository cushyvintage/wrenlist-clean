// lib/stripe/plans.ts
// Single source of truth for all plan configuration

export type PlanId = 'free' | 'nester' | 'forager' | 'flock'

/**
 * Founding Flock pricing window.
 *
 * Sellers who sign up before FOUNDING_FLOCK_DEADLINE lock in the
 * `monthlyPrice` / `annualPrice` shown here FOR LIFE. After the deadline,
 * new sign-ups see the `postLaunchMonthlyPrice` / `postLaunchAnnualPrice`.
 *
 * Existing Stripe subscriptions keep their original price ID unless
 * actively migrated, so this flag is mainly used for UI copy + future
 * price-ID resolution at checkout time.
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
  findsPerMonth: number | null // null = unlimited (only ever true on free? no — capped at 2000 on Flock)
  marketplaces: number | null  // always null in v3 — every plan gets every marketplace
  featured?: boolean
  features: { label: string; included: boolean; detail?: string }[]
  stripePriceIds: { monthly: string | null; annual: string | null }
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Log up to 25 finds a month. Every marketplace, AI built in.',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthlyEquiv: 0,
    findsPerMonth: 25,
    marketplaces: null,
    stripePriceIds: { monthly: null, annual: null },
    features: [
      { label: '25 finds / month', included: true },
      { label: 'Every supported marketplace', included: true },
      { label: 'AI listing assist included', included: true },
      { label: 'Crosslisting + auto-delist', included: true },
      { label: 'Inventory tracker', included: true },
      { label: 'Sales tracking', included: true },
    ],
  },
  {
    id: 'nester',
    name: 'Nester',
    tagline: 'For side-hustlers listing 250 finds a month.',
    monthlyPrice: 9,
    annualPrice: 90,
    annualMonthlyEquiv: 8,
    postLaunchMonthlyPrice: 14,
    postLaunchAnnualPrice: 140,
    findsPerMonth: 250,
    marketplaces: null,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_NESTER_FOUNDING_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_NESTER_FOUNDING_ANNUAL ?? '',
    },
    features: [
      { label: '250 finds / month', included: true },
      { label: 'Everything in Free', included: true },
      { label: 'Bulk actions', included: true },
      { label: 'Priority listing queue', included: true },
    ],
  },
  {
    id: 'forager',
    name: 'Forager',
    tagline: 'For real resellers — 750 finds, all marketplaces, every feature.',
    monthlyPrice: 14,
    annualPrice: 140,
    annualMonthlyEquiv: 12,
    postLaunchMonthlyPrice: 24,
    postLaunchAnnualPrice: 240,
    findsPerMonth: 750,
    marketplaces: null,
    featured: true,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FORAGER_FOUNDING_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FORAGER_FOUNDING_ANNUAL ?? '',
    },
    features: [
      { label: '750 finds / month', included: true },
      { label: 'Everything in Nester', included: true },
      { label: 'Price suggestions', included: true },
      { label: 'Full margin & ROI analytics', included: true },
    ],
  },
  {
    id: 'flock',
    name: 'Flock',
    tagline: 'For power-sellers — up to 2,000 finds a month.',
    monthlyPrice: 24,
    annualPrice: 240,
    annualMonthlyEquiv: 20,
    postLaunchMonthlyPrice: 39,
    postLaunchAnnualPrice: 390,
    findsPerMonth: 2000,
    marketplaces: null,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FLOCK_FOUNDING_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FLOCK_FOUNDING_ANNUAL ?? '',
    },
    features: [
      { label: '2,000 finds / month', included: true },
      { label: 'Everything in Forager', included: true },
      { label: 'Priority support', included: true },
      { label: 'Early access to new features', included: true },
    ],
  },
]

export const PLAN_LIMITS: Record<PlanId, { finds: number | null; marketplaces: number | null }> = {
  free:    { finds: 25,   marketplaces: null },
  nester:  { finds: 250,  marketplaces: null },
  forager: { finds: 750,  marketplaces: null },
  flock:   { finds: 2000, marketplaces: null },
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find(p => p.id === id)!
}

export function getFindsLimit(planId: PlanId): number | null {
  return PLAN_LIMITS[planId]?.finds ?? null
}
