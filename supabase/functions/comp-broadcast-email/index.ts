import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { compId, organizerId, message } = await req.json()

    if (!compId || !organizerId || !message) {
      return new Response(JSON.stringify({ error: 'compId, organizerId, and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // コンペ情報を取得して主催者を検証
    const { data: comp, error: compError } = await supabase
      .from('competitions')
      .select('title, organizer_id')
      .eq('id', compId)
      .single()

    if (compError || !comp) {
      return new Response(JSON.stringify({ error: 'Competition not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (comp.organizer_id !== organizerId) {
      return new Response(JSON.stringify({ error: 'Forbidden: not the organizer' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 参加者一覧を取得
    const { data: entries, error: entriesError } = await supabase
      .from('comp_entries')
      .select('user_id')
      .eq('comp_id', compId)

    if (entriesError || !entries || entries.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 各参加者のメールを取得して送信
    let sent = 0
    for (const entry of entries) {
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(entry.user_id)
      if (userError || !user?.email) continue

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GLH. <noreply@golflink-hiroshima.com>',
          to: [user.email],
          subject: `【GLH.】${comp.title} 主催者からのお知らせ`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
              <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">主催者からのお知らせ</h2>
              <p style="font-size:13px;color:#666;margin-bottom:8px">コンペ：<strong>${comp.title}</strong></p>
              <div style="background:#f5f5f5;border-radius:8px;padding:16px;font-size:15px;line-height:1.8;margin-bottom:24px;white-space:pre-wrap">${message}</div>
              <a
                href="https://golflink-hiroshima.com/course/${compId}"
                style="display:inline-block;background:#3b6b2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:700"
              >
                コンペ詳細を確認する
              </a>
              <p style="font-size:12px;color:#888;margin-top:32px">
                このメールはGLH.（ゴルフリンク広島）から自動送信されています。
              </p>
            </div>
          `,
        }),
      })

      if (emailRes.ok) sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
