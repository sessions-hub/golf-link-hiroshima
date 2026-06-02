import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  // リクエストユーザーの認証確認
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 呼び出し元がグループのメンバーか確認（RLS が効く anon クライアントで）
  const { data: membership } = await supabase
    .from('friend_group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // service role で全メンバーを取得
  const { data: memberRows, error: memberErr } = await adminSupabase
    .from('friend_group_members')
    .select('user_id')
    .eq('group_id', groupId)
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  const memberIds = (memberRows ?? []).map(r => r.user_id)
  if (memberIds.length === 0) return NextResponse.json([])

  const { data: profileData, error: profileErr } = await adminSupabase
    .from('profiles')
    .select('user_id, nickname, avatar_url')
    .in('user_id', memberIds)
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  const profileMap = new Map((profileData ?? []).map(p => [p.user_id, p]))
  const members = memberIds.map(uid => ({
    user_id: uid,
    profiles: profileMap.get(uid) ?? null,
  }))

  return NextResponse.json(members)
}
