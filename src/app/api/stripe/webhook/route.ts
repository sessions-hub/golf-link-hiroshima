import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any
        const customerId = sub.customer as string
        const priceId = sub.items?.data[0]?.price?.id
        const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
          ? 'executive' : 'premium'

        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const email = customer.email
        if (!email) {
          console.log('No email found for customer:', customerId)
          break
        }

        console.log(`Processing subscription for email: ${email}, plan: ${plan}`)

        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })

        if (usersError) {
          console.error('Error listing users:', usersError)
          break
        }

        const user = users.find(u => u.email === email)
        if (!user) {
          console.log('No user found for email:', email)
          break
        }

        console.log(`Found user: ${user.id}`)

        const { error: profileError } = await supabase.from('profiles')
          .update({ plan })
          .eq('user_id', user.id)

        if (profileError) console.error('Profile update error:', profileError)

        const periodEndUnix: number | undefined = sub.items?.data?.[0]?.current_period_end
        const currentPeriodEnd = periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null

        const { error: subError } = await supabase.from('subscriptions').upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          current_period_end: currentPeriodEnd,
        }, { onConflict: 'user_id' })

        if (subError) console.error('Subscription upsert error:', subError)
        else console.log(`Successfully updated plan to ${plan} for user ${user.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        const customerId = sub.customer as string

        const { data } = await supabase.from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (data?.user_id) {
          await supabase.from('profiles')
            .update({ plan: 'free' })
            .eq('user_id', data.user_id)

          await supabase.from('subscriptions')
            .update({ plan: 'free', status: 'canceled' })
            .eq('user_id', data.user_id)

          console.log(`Cancelled subscription for user ${data.user_id}`)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
