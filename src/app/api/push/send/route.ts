import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, url } = await request.json()

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!sub) return NextResponse.json({ error: 'No subscription' }, { status: 404 })

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      }
    }

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({ title, body, url })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
