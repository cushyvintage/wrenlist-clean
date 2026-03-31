import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { PlanId } from '@/types'

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 * Events: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('STRIPE_WEBHOOK_SECRET not configured')
      }
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    // Verify Stripe signature
    let event: any
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Webhook signature verification failed:', error)
      }
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_failed':
        // Log but don't take action yet
        if (process.env.NODE_ENV !== 'production') {
          console.log('Payment failed for invoice:', event.data.object.id)
        }
        break

      default:
        // Ignore other event types
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Webhook handler error:', error)
    }
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed event
 * Update user's plan when subscription succeeds
 */
async function handleCheckoutSessionCompleted(session: any) {
  try {
    const userId = session.metadata?.user_id
    const planId = session.metadata?.plan_id

    if (!userId || !planId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Checkout session missing user_id or plan_id', session.id)
      }
      return
    }

    // Update user profile with new plan
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        plan: planId as PlanId,
        stripe_customer_id: session.customer,
        finds_reset_at: new Date().toISOString(),
        finds_this_month: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to update profile after checkout:', error)
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('handleCheckoutSessionCompleted error:', error)
    }
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrade user to free plan when subscription is cancelled
 */
async function handleSubscriptionDeleted(subscription: any) {
  try {
    const customerId = subscription.customer

    if (!customerId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Subscription deletion missing customer_id')
      }
      return
    }

    // Find user by Stripe customer ID and downgrade to free
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to downgrade profile after subscription deletion:', error)
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('handleSubscriptionDeleted error:', error)
    }
  }
}
