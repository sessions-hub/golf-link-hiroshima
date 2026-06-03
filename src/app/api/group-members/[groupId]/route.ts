import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getCallerMembership(supabase: any, groupId: string, userId: string) {
  const { data } = await supabase
    .from('friend_group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getCallerMembership(supabase, groupId, user.id)
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: memberRows, error: memberErr } = await adminSupabase
    .from('friend_group_members')
    .select('user_id')
    .eq('group_id', groupId)
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  const memberIds = (memberRows ?? []).map((r: any) => r.user_id)
  if (memberIds.length === 0) return NextResponse.json([])

  const { data: profileData, error: profileErr } = await adminSupabase
    .from('profiles')
    .select('user_id, nickname, avatar_url')
    .in('user_id', memberIds)
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  const profileMap = new Map((profileData ?? []).map((p: any) => [p.user_id, p]))
  const members = memberIds.map((uid: string) => ({
    user_id: uid,
    profiles: profileMap.get(uid) ?? null,
  }))

  return NextResponse.json(members)
}

// メンバー追加（グループメンバーなら誰でも可）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const { userIds } = await req.json()
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: 'userIds required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getCallerMembership(supabase, groupId, user.id)
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = (userIds as string[]).map(uid => ({ group_id: groupId, user_id: uid }))
  const { error } = await adminSupabase.from('friend_group_members').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// メンバー削除・退会（自分自身、または作成者が他メンバーを削除）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 自分以外を削除する場合は作成者のみ許可
  if (targetUserId !== user.id) {
    const { data: group } = await adminSupabase
      .from('friend_groups')
      .select('created_by')
      .eq('id', groupId)
      .single()
    if (!group || group.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await adminSupabase
    .from('friend_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
