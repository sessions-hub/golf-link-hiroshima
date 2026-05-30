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
    const { compId, applicantId } = await req.json()

    if (!compId || !applicantId) {
      return new Response(JSON.stringify({ error: 'compId and applicantId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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

    const { data: applicant } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', applicantId)
      .single()

    const applicantName = applicant?.nickname ?? '参加者'

    const { data: { user: organizer }, error: orgError } = await supabase.auth.admin.getUserById(comp.organizer_id)

    if (orgError || !organizer?.email) {
      return new Response(JSON.stringify({ error: 'Organizer email not found' }), {
        status: 404,
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

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GLH. <noreply@golflink-hiroshima.com>',
        to: [organizer.email],
        subject: `【GLH.】${applicantName}さんが${comp.title}の参加をキャンセルしました`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">参加キャンセル通知</h2>
            <p style="font-size:15px;line-height:1.7;margin-bottom:24px">
              <strong>${applicantName}</strong>さんが<strong>「${comp.title}」</strong>の参加をキャンセルしました。
            </p>
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

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error('Resend error:', errBody)
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: errBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
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
