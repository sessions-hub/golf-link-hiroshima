import { createClient } from '@/lib/supabase/client'

export type Plan = 'free' | 'premium' | 'executive'

// DB に旧プラン名が残っている場合の後方互換マッピング
// standard(旧) → premium(新)
export function normalizePlan(raw: string | null | undefined): Plan {
  if (raw === 'standard') return 'premium'
  if (raw === 'premium' || raw === 'executive') return raw as Plan
  return 'free'
}

export async function getUserPlan(): Promise<Plan> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { data } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  if (!data) return 'free'
  return normalizePlan(data.plan)
}


export function canUseGPS(_plan: Plan) {
  return true
}

export function canJoinComp(_plan: Plan) {
  return true
}

export function canHostComp(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}

export function canSeeWhoLiked(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}

export function canSeeWhoVisited(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}

export function isPremium(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}

export function canSeeInterest(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}
