import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nickname, email } = await req.json()

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const registeredAt = jst.toISOString().replace('T', ' ').substring(0, 19) + ' JST'

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GLH. <noreply@golflink-hiroshima.com>',
        to: ['info@sessions-inc.jp'],
        subject: '【GLH】新規ユーザー登録がありました',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
            <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">新規ユーザー登録通知</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;width:120px">ニックネーム</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:700">${nickname ?? '未設定'}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666">メールアドレス</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee">${email ?? '不明'}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#666">登録日時</td>
                <td style="padding:10px 0">${registeredAt}</td>
              </tr>
            </table>
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
