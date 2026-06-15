'use client'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const HIDE_NAV: Array<(p: string) => boolean> = [
  (p) => p.startsWith('/chat/'),        // /chat/[roomId] and /chat/group/[groupId]
  (p) => p.startsWith('/comp/'),        // /comp/[compId]/chat
  (p) => p.startsWith('/profile/edit'),
  (p) => p.startsWith('/profile/delete'),
  (p) => p.startsWith('/admin'),
  (p) => p.startsWith('/legal/'),
  (p) => p === '/subscription/success',
]

export default function ConditionalBottomNav() {
  const pathname = usePathname()
  if (HIDE_NAV.some((fn) => fn(pathname))) return null
  return <BottomNav />
}
