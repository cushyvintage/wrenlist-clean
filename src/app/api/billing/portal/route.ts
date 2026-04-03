import { withAuth } from '@/lib/api-helpers'
import { stripe } from '@/lib/stripe'
import { ApiResponseHelper } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user, supabase) => {
    try {
      const body = await req.json()
      const { returnUrl } = body

      if (!returnUrl) {
        return ApiResponseHelper.badRequest('Missing required parameter: returnUrl')
      }

      // Get user's Stripe customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      if (!profile?.stripe_customer_id) {
        return ApiResponseHelper.badRequest('User does not have a Stripe customer ID')
      }

      // Create portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: returnUrl,
      })

      if (!portalSession.url) {
        return ApiResponseHelper.internalError('Failed to create portal session')
      }

      return ApiResponseHelper.success({ url: portalSession.url })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      if (process.env.NODE_ENV !== 'production') {
        console.error('POST /api/billing/portal error:', msg)
      }
      return ApiResponseHelper.internalError(msg)
    }
  })
}
