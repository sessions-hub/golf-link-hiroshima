import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

export async function POST(request: NextRequest) {
  try {
    const { priceId, plan, userEmail, userId } = await request.json()

    if (!priceId || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let trialDays = 0
    if (userId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: profile } = await supabase
        .from('profiles')
        .select('free_months_earned')
        .eq('user_id', userId)
        .single()

      if (profile && profile.free_months_earned > 0) {
        trialDays = 30
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
      customer_email: userEmail,
      metadata: { plan, userId: userId ?? '' },
      ...(trialDays > 0 ? {
        subscription_data: {
          trial_period_days: trialDays,
          metadata: { userId: userId ?? '' },
        },
      } : {}),
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
