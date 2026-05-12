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
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const priceId = sub.items.data[0]?.price.id

        // プランを判定
        const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
          ? 'premium' : 'standard'

        // customerからメールを取得
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        const email = customer.email

        if (!email) break

        // メールからユーザーIDを取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', (await supabase.auth.admin.getUserByEmail(email)).data.user?.id ?? '')
          .single()

        // auth.usersからメールでユーザーを検索
        const { data: authData } = await supabase.auth.admin.listUsers()
        const user = authData?.users?.find(u => u.email === email)

        if (!user) break

        // プロフィールを更新
        await supabase.from('profiles')
          .update({ plan })
          .eq('user_id', user.id)

        // サブスクリプションテーブルに保存
        await supabase.from('subscriptions').upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan,
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }, { onConflict: 'user_id' })

        console.log(`Updated plan to ${plan} for user ${user.id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
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
