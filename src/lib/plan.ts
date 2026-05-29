import { createClient } from '@/lib/supabase/client'

export type Plan = 'free' | 'premium' | 'executive'

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


export function canUseGPS(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}

export function canJoinComp(plan: Plan) {
  return plan === 'premium' || plan === 'executive'
}

export function canHostComp(plan: Plan) {
  return plan === 'executive'
}

export function canSeeWhoLiked(plan: Plan) {
  return plan === 'executive'
}

export function canSeeWhoVisited(plan: Plan) {
  return plan === 'executive'
}

export function isPremium(plan: Plan) {
  return plan === 'executive'
}

export function canSeeInterest(plan: Plan) {
  return plan === 'executive'
}
