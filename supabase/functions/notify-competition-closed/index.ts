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
    const { compId, reason } = await req.json()

    if (!compId || !reason) {
      return new Response(JSON.stringify({ error: 'compId and reason are required' }), {
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
      .select('title, organizer_id, type, entry_deadline, max_players')
      .eq('id', compId)
      .single()

    if (compError || !comp) {
      return new Response(JSON.stringify({ error: 'Competition not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const isDeadline = reason === 'deadline'

    const deadlineStr = comp.entry_deadline
      ? new Date(comp.entry_deadline).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : ''

    const emailSubject = isDeadline
      ? `【GLH.】${comp.title}の募集が締め切られました`
      : `【GLH.】${comp.title}が満員になりました`

    const emailHeading = isDeadline ? '募集締切のお知らせ' : '満員のお知らせ'

    const emailBody = isDeadline
      ? `募集締切日時（${deadlineStr}）を過ぎたため、自動的に締め切られました。`
      : `募集定員（${comp.max_players}名）に達したため、自動的に締め切られました。`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GLH. <noreply@golflink-hiroshima.com>',
        to: [organizer.email],
        subject: emailSubject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">${emailHeading}</h2>
            <p style="font-size:15px;line-height:1.7;margin-bottom:24px">
              <strong>「${comp.title}」</strong>は、${emailBody}
            </p>
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
