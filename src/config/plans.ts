// lib/stripe/plans.ts
// Single source of truth for all plan configuration

export type PlanId = 'free' | 'nester' | 'flourish' | 'forager' | 'soar' | 'flock'

/**
 * Founding Flock pricing window.
 *
 * Sellers who sign up before FOUNDING_FLOCK_DEADLINE lock in the
 * `monthlyPrice` / `annualPrice` shown here FOR LIFE. After the deadline,
 * new sign-ups see the `postLaunchMonthlyPrice` / `postLaunchAnnualPrice`.
 *
 * Existing Stripe subscriptions keep their original price ID unless
 * actively migrated, so this flag is mainly used for UI copy + future
 * price-ID resolution.
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
  annualPrice: number      // total annual charge
  annualMonthlyEquiv: number // monthly equivalent when billed annually
  postLaunchMonthlyPrice?: number // price after founding flock window
  postLaunchAnnualPrice?: number
  findsPerMonth: number | null // null = unlimited
  marketplaces: number | null  // null = all
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
    tagline: 'Try Wrenlist with no commitment. Log your first 25 finds and see how it works.',
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthlyEquiv: 0,
    findsPerMonth: 25,
    marketplaces: 1,
    stripePriceIds: { monthly: null, annual: null },
    features: [
      { label: '25 finds / month', included: true },
      { label: 'Inventory tracker', included: true },
      { label: '1 marketplace', included: true },
      { label: 'Basic analytics', included: true },
      { label: 'Crosslisting', included: false },
      { label: 'Auto-delist on sale', included: false },
    ],
  },
  {
    id: 'nester',
    name: 'Nester',
    tagline: 'For casual thrifters listing regularly across a couple of platforms.',
    monthlyPrice: 14,
    annualPrice: 134,
    annualMonthlyEquiv: 11,
    postLaunchMonthlyPrice: 17,
    postLaunchAnnualPrice: 163,
    findsPerMonth: 100,
    marketplaces: 3,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_NESTER_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_NESTER_ANNUAL ?? '',
    },
    features: [
      { label: '100 finds / month', included: true },
      { label: '3 marketplaces', included: true },
      { label: 'Crosslisting', included: true },
      { label: 'Auto-delist on sale', included: true },
      { label: 'Sales tracking', included: true },
      { label: 'AI listing generator', included: false },
    ],
  },
  {
    id: 'flourish',
    name: 'Flourish',
    tagline: "For growing resellers who have outgrown Nester but don't need 500 finds yet.",
    monthlyPrice: 19,
    annualPrice: 182,
    annualMonthlyEquiv: 15,
    postLaunchMonthlyPrice: 24,
    postLaunchAnnualPrice: 230,
    findsPerMonth: 250,
    marketplaces: 4,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FLOURISH_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FLOURISH_ANNUAL ?? '',
    },
    features: [
      { label: '250 finds / month', included: true },
      { label: '4 marketplaces', included: true },
      { label: 'Crosslisting + auto-delist', included: true },
      { label: 'AI listing generator', included: true },
      { label: 'Bulk actions', included: true },
      { label: 'Sales tracking', included: true },
    ],
  },
  {
    id: 'forager',
    name: 'Forager',
    tagline: 'For serious resellers building a real business across all UK platforms.',
    monthlyPrice: 29,
    annualPrice: 278,
    annualMonthlyEquiv: 23,
    postLaunchMonthlyPrice: 34,
    postLaunchAnnualPrice: 326,
    findsPerMonth: 500,
    marketplaces: null,
    featured: true,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FORAGER_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FORAGER_ANNUAL ?? '',
    },
    features: [
      { label: '500 finds / month', included: true },
      { label: 'All marketplaces', included: true },
      { label: 'AI listing generator', included: true },
      { label: 'Bulk actions', included: true },
      { label: 'Price suggestions', included: true },
      { label: 'Unlimited BG removal', included: true },
      { label: 'Full analytics', included: true },
    ],
  },
  {
    id: 'soar',
    name: 'Soar',
    tagline: 'Unlimited finds for solo power-sellers. No team overhead, no cap.',
    monthlyPrice: 39,
    annualPrice: 374,
    annualMonthlyEquiv: 31,
    postLaunchMonthlyPrice: 49,
    postLaunchAnnualPrice: 470,
    findsPerMonth: null,
    marketplaces: null,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_SOAR_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_SOAR_ANNUAL ?? '',
    },
    features: [
      { label: 'Unlimited finds', included: true },
      { label: 'All marketplaces', included: true },
      { label: 'Everything in Forager', included: true },
      { label: 'Priority listing queue', included: true },
      { label: 'Advanced sourcing analytics', included: true },
      { label: 'Priority support', included: true },
    ],
  },
  {
    id: 'flock',
    name: 'Flock',
    tagline: 'For small teams and vintage shops running multi-channel operations.',
    monthlyPrice: 59,
    annualPrice: 566,
    annualMonthlyEquiv: 47,
    postLaunchMonthlyPrice: 69,
    postLaunchAnnualPrice: 662,
    findsPerMonth: null,
    marketplaces: null,
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_FLOCK_MONTHLY ?? '',
      annual: process.env.STRIPE_PRICE_FLOCK_ANNUAL ?? '',
    },
    features: [
      { label: 'Everything in Soar', included: true },
      { label: '3 team seats', included: true },
      { label: 'Shared inventory', included: true },
      { label: 'API access', included: true },
      { label: 'Custom Shopify storefront', included: true },
      { label: 'Dedicated onboarding', included: true },
    ],
  },
]

export const PLAN_LIMITS: Record<PlanId, { finds: number | null; marketplaces: number | null }> = {
  free:     { finds: 25,   marketplaces: 1 },
  nester:   { finds: 100,  marketplaces: 3 },
  flourish: { finds: 250,  marketplaces: 4 },
  forager:  { finds: 500,  marketplaces: null },
  soar:     { finds: null, marketplaces: null },
  flock:    { finds: null, marketplaces: null },
}

export function getPlan(id: PlanId): Plan {
  return PLANS.find(p => p.id === id)!
}

export function getFindsLimit(planId: PlanId): number | null {
  return PLAN_LIMITS[planId]?.finds ?? null
}
