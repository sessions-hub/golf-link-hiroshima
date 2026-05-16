import { createClient } from '@/lib/supabase/client'

export type Plan = 'free' | 'standard' | 'premium'

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
  return (data.plan as Plan) ?? 'free'
}

export function canCreateChat(plan: Plan) {
  return plan === 'standard' || plan === 'premium'
}

export function canUseGPS(plan: Plan) {
  return plan === 'standard' || plan === 'premium'
}

export function canJoinComp(plan: Plan) {
  return plan === 'standard' || plan === 'premium'
}

export function canHostComp(plan: Plan) {
  return plan === 'premium'
}

export function canSeeWhoLiked(plan: Plan) {
  return plan === 'premium'
}

export function canSeeWhoVisited(plan: Plan) {
  return plan === 'premium'
}

export function isPremium(plan: Plan) {
  return plan === 'premium'
}
