'use client'

import { useEffect, useState } from 'react'
import { PLANS } from '@/config/plans'
import type { PlanId } from '@/config/plans'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface UserProfile {
  plan: PlanId
  stripe_customer_id: string | null
  finds_this_month: number
}

export default function BillingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const response = await fetch('/api/profiles/me')
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      const json = await response.json()
      setProfile(json.data ?? json)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('[Billing Error]', msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId: string, interval: 'monthly' | 'annual' = 'monthly') {
    const key = `${planId}-${interval}`
    setCheckoutLoading(key)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          interval,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || 'Failed to create checkout session')
      }

      const { data: session } = await response.json()
      if (session?.url) {
        window.location.href = session.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('[Checkout Error]', msg)
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { data: session } = await response.json()
      if (session?.url) {
        window.location.href = session.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      console.error('[Portal Error]', msg)
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-ink-lt">Loading billing information...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-red">Failed to load profile</p>
      </div>
    )
  }

  const currentPlan = PLANS.find(p => p.id === profile.plan)
  const planLimit = currentPlan?.findsPerMonth

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Success/Cancelled Messages */}
      {typeof window !== 'undefined' && (
        <>
          {new URLSearchParams(window.location.search).get('upgraded') && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 text-sm">
                  Subscription updated successfully
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Your plan has been upgraded. You now have access to all new features.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900 text-sm">Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="bg-sage-pale border border-sage rounded-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-serif text-lg italic text-sage mb-1">
                {currentPlan.name} Plan
              </h2>
              <p className="text-xs text-sage-dim">
                {profile.stripe_customer_id
                  ? 'Active subscription'
                  : profile.plan === 'free'
                    ? 'Free plan'
                    : `${currentPlan.name} plan — no active billing`}
              </p>
            </div>
            {profile.stripe_customer_id ? (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="px-3 py-1.5 text-xs bg-white border border-sage rounded-sm text-sage font-medium hover:bg-sage-pale transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? 'Loading...' : 'Manage Billing'}
              </button>
            ) : profile.plan === 'flock' ? null : (
              <a
                href="#plans"
                className="px-3 py-1.5 text-xs bg-sage text-cream rounded-sm font-medium hover:bg-sage-dk transition-colors"
              >
                Upgrade Plan
              </a>
            )}
          </div>

          <div className="space-y-3">
            {/* Finds Usage */}
            {planLimit && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase tracking-wider font-medium text-sage-dim">
                    Finds This Month
                  </label>
                  <span className="text-sm font-medium text-ink">
                    {profile.finds_this_month} / {planLimit}
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="bg-sage h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (profile.finds_this_month / planLimit) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Features List */}
            <div className="border-t border-sage/20 pt-4">
              <p className="text-xs uppercase tracking-wider font-medium text-sage-dim mb-3">
                Included Features
              </p>
              <div className="grid grid-cols-2 gap-2">
                {currentPlan.features
                  .filter(f => f.included)
                  .map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-ink-lt">{feature.label}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div id="plans">
        <h3 className="font-serif text-lg italic text-ink mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const isCurrentPlan = plan.id === profile.plan

            return (
              <div
                key={plan.id}
                className={`rounded-md border p-5 transition-all ${
                  isCurrentPlan
                    ? 'border-sage bg-sage-pale'
                    : 'border-sage/14 bg-white hover:border-sage/30'
                }`}
              >
                {/* Plan Name & Price */}
                <h4 className="font-serif text-base italic text-ink mb-1">
                  {plan.name}
                </h4>
                {plan.monthlyPrice > 0 ? (
                  <p className="text-sm font-mono font-medium text-sage mb-3">
                    £{plan.monthlyPrice}/mo
                  </p>
                ) : (
                  <p className="text-sm font-mono font-medium text-sage mb-3">
                    Free
                  </p>
                )}

                {/* Finds Limit */}
                {plan.findsPerMonth ? (
                  <p className="text-xs text-ink-lt mb-3">
                    {plan.findsPerMonth} finds/month
                  </p>
                ) : (
                  <p className="text-xs text-ink-lt mb-3">
                    Unlimited finds
                  </p>
                )}

                {/* Features */}
                <ul className="space-y-2 mb-4">
                  {plan.features.slice(0, 3).map((feature, idx) => (
                    <li
                      key={idx}
                      className={`text-xs ${
                        feature.included
                          ? 'text-ink-lt'
                          : 'text-sage-dim line-through'
                      }`}
                    >
                      {feature.label}
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-3 py-2 bg-sage text-cream rounded-sm text-xs font-medium cursor-default opacity-70"
                  >
                    Current Plan
                  </button>
                ) : plan.monthlyPrice === 0 ? (
                  <button
                    disabled
                    className="w-full px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-xs font-medium text-ink-lt cursor-default"
                  >
                    Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id, 'monthly')}
                    disabled={checkoutLoading === `${plan.id}-monthly`}
                    className="w-full px-3 py-2 bg-sage text-cream rounded-sm text-xs font-medium hover:bg-sage-dk transition-colors disabled:opacity-50"
                  >
                    {checkoutLoading === `${plan.id}-monthly`
                      ? 'Loading...'
                      : 'Upgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-cream-md rounded-md p-5 border border-sage/14">
        <h4 className="font-medium text-ink text-sm mb-2">Questions about billing?</h4>
        <p className="text-xs text-ink-lt mb-3">
          Check our FAQ or contact support for help with subscriptions, billing cycles, and plan changes.
        </p>
        <a
          href="mailto:hello@wrenlist.com"
          className="text-xs font-medium text-sage hover:text-sage-dk transition-colors underline"
        >
          Contact Support
        </a>
      </div>
    </div>
  )
}
