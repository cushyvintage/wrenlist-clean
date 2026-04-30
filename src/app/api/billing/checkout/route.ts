import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { isBetaActive, isFoundingFlockWindow } from '@/config/plans'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    // During the open beta, every user has unlimited access to every feature.
    // Reject upgrade checkouts so nobody gets charged for something they
    // already have. The UI hides the CTAs too; this is the last line of
    // defence if a stale tab slips through.
    if (isBetaActive()) {
      return ApiResponseHelper.badRequest(
        'Open beta is active — all plans are unlocked until the beta ends.'
      )
    }

    const body = await request.json()
    const { planId, interval } = body // interval: "monthly" | "annual"

    // Validate inputs
    if (!planId || !interval) {
      return ApiResponseHelper.badRequest('Missing planId or interval')
    }

    if (!['monthly', 'annual'].includes(interval)) {
      return ApiResponseHelper.badRequest('interval must be "monthly" or "annual"')
    }

    // Get user profile to check for existing Stripe customer
    const supabase = await createSupabaseServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return ApiResponseHelper.notFound('User profile not found')
    }

    // Founding Flock window locks signups in at the founder rate.
    // After the deadline, new signups see the standard price. Existing
    // subscriptions keep their original price ID — Stripe never auto-migrates.
    const founding = isFoundingFlockWindow()
    const priceMap: Record<string, Record<string, string>> = {
      flock: {
        monthly: founding
          ? process.env.STRIPE_PRICE_FLOCK_FOUNDING_MONTHLY!
          : process.env.STRIPE_PRICE_FLOCK_STANDARD_MONTHLY!,
        annual: founding
          ? process.env.STRIPE_PRICE_FLOCK_FOUNDING_ANNUAL!
          : process.env.STRIPE_PRICE_FLOCK_STANDARD_ANNUAL!,
      },
    }

    const priceId = priceMap[planId]?.[interval]
    if (!priceId || priceId === 'price_placeholder') {
      return ApiResponseHelper.error('Stripe not configured yet', 503)
    }

    const session = await stripe.checkout.sessions.create({
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
      },
    })

    if (!session.url) {
      return ApiResponseHelper.internalError('Failed to create checkout session')
    }

    return ApiResponseHelper.success({ url: session.url })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/billing/checkout error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
