import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, reason, otherText } = await request.json()

    if (!userId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single()

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const stripeSub = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    }) as any

    const periodEndUnix: number | undefined = stripeSub.items?.data?.[0]?.current_period_end
    const currentPeriodEnd = periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null

    await supabase
      .from('subscriptions')
      .update({ cancel_at_period_end: true, current_period_end: currentPeriodEnd })
      .eq('user_id', userId)

    await supabase.from('cancellation_feedback').insert({
      user_id: userId,
      reason,
      other_text: otherText ?? null,
    })

    return NextResponse.json({ success: true, current_period_end: currentPeriodEnd })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
