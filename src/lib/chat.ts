import { createClient } from '@/lib/supabase/client'

// チャットルームを作成または取得
export async function getOrCreateChatRoom(
  myUserId: string,
  otherUserId: string
): Promise<string | null> {
  const supabase = createClient()

  // 既存のルームを検索
  const { data: existing } = await supabase
    .from('chat_rooms')
    .select('id')
    .or(
      `and(user1_id.eq.${myUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${myUserId})`
    )
    .single()

  if (existing) return existing.id

  // 新規作成
  const { data: newRoom, error } = await supabase
    .from('chat_rooms')
    .insert({
      user1_id: myUserId,
      user2_id: otherUserId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create chat room:', error)
    return null
  }

  return newRoom.id
}
