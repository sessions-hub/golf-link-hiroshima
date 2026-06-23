import type { SupabaseClient } from '@supabase/supabase-js'

export type ActiveRound = {
  id: string
  user_id: string
  source: 'gps' | 'manual'
  venue_name: string
  course_name: string
  course_id: string | null
  combo_label: string | null
  combo_course_ids: string[] | null
  hole_scores: number[]
  hole_count: number
  current_hole: number | null
  round_date: string
  updated_at: string
  created_at: string
}

export type ActiveRoundPayload = Omit<ActiveRound, 'id' | 'updated_at' | 'created_at'>

export type FinalizePayload = {
  user_id: string
  course_name: string
  round_date: string
  played_at: string
  total_score: number
  out_score: number
  in_score: number | null
  hole_scores: number[]
}

// 進行中ラウンドを保存/更新（スコア変更のたびに呼ぶ）
// user_id の UNIQUE 制約により、既存行は UPDATE・未存在なら INSERT される
// updated_at は DB トリガーが自動更新するためペイロードに含めない
export async function upsertActiveRound(
  supabase: SupabaseClient,
  payload: ActiveRoundPayload,
): Promise<boolean> {
  const { error } = await supabase
    .from('active_rounds')
    .upsert(payload, { onConflict: 'user_id' })
  if (error) {
    console.error('Failed to upsert active round:', error)
    return false
  }
  return true
}

// 指定 source の進行中ラウンドを1件取得（なければ null）
// GPS 画面は source='gps'、スコア画面は source='manual' で呼ぶ
// .maybeSingle() を使うことで「行なし」は error ではなく data=null として扱われ、
// 正常系（進行中ラウンドなし）でエラーログが出ない
export async function loadActiveRound(
  supabase: SupabaseClient,
  userId: string,
  source: 'gps' | 'manual',
): Promise<ActiveRound | null> {
  const { data, error } = await supabase
    .from('active_rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('source', source)
    .maybeSingle()
  if (error) {
    console.error('Failed to load active round:', error)
    return null
  }
  return data as ActiveRound | null
}

// ラウンド完成処理：scorecards へ INSERT 後に active_rounds を DELETE
// scorecards INSERT が失敗した場合は DELETE しない（進行中データを保護）
// DELETE 失敗時は1回リトライし、それでも失敗した場合はログのみ残して true を返す
// （scorecard の INSERT は成功しているため、完成処理自体は成功扱い）
export async function finalizeRound(
  supabase: SupabaseClient,
  payload: FinalizePayload,
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from('scorecards')
    .insert(payload)
  if (insertError) {
    console.error('Failed to insert scorecard:', insertError)
    return false
  }
  const deleteActiveRound = () =>
    supabase.from('active_rounds').delete().eq('user_id', payload.user_id)
  const { error: deleteError } = await deleteActiveRound()
  if (deleteError) {
    const { error: retryError } = await deleteActiveRound()
    if (retryError) {
      console.error('Failed to delete active round after finalize (retry exhausted):', retryError)
    }
  }
  return true
}

// 進行中ラウンドを破棄（「破棄して新規」操作・cron による自動破棄に使う）
export async function discardActiveRound(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('active_rounds')
    .delete()
    .eq('user_id', userId)
  if (error) {
    console.error('Failed to discard active round:', error)
    return false
  }
  return true
}
