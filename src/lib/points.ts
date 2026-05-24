import type { SupabaseClient } from '@supabase/supabase-js'

export async function addPoints(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<void> {
  await supabase.rpc('add_user_points', { p_user_id: userId, p_amount: amount })
}
