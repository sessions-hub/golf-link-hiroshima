'use client'
import { useRef, useEffect } from 'react'

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '👏']

interface PaletteProps {
  myEmoji?: string | null
  onSelect: (emoji: string) => void
  onClose: () => void
}

export function ReactionPalette({ myEmoji, onSelect, onClose }: PaletteProps) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    // バブリングフェーズで取得（stopPropagationで各ページ側からキャンセル可能）
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  return (
    <div
      ref={ref}
      style={{
        display: 'inline-flex', gap: 2, background: 'white',
        borderRadius: 999, padding: '6px 10px',
        boxShadow: '0 4px 24px rgba(0,0,0,.2)',
        border: '1px solid var(--line)', zIndex: 349, position: 'relative',
      }}
    >
      {REACTION_EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={(e) => { e.stopPropagation(); onSelect(emoji); onClose() }}
          style={{
            width: 38, height: 38, borderRadius: '50%', border: 'none',
            background: myEmoji === emoji ? 'rgba(22,101,52,.1)' : 'transparent',
            fontSize: 22, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            outline: myEmoji === emoji ? '2px solid var(--g3)' : 'none',
            outlineOffset: -2,
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

interface BarProps {
  reactions: Record<string, string[]>
  myId: string
  onToggle: (emoji: string) => void
}

export function ReactionBar({ reactions, myId, onToggle }: BarProps) {
  const entries = Object.entries(reactions).filter(([, ids]) => ids.length > 0)
  if (entries.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
      {entries.map(([emoji, ids]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            background: ids.includes(myId) ? 'rgba(22,101,52,.08)' : 'var(--surf)',
            border: `1px solid ${ids.includes(myId) ? 'var(--g3)' : 'var(--line)'}`,
            borderRadius: 999, padding: '2px 7px', cursor: 'pointer',
            fontSize: 11, color: 'var(--txt)',
          }}
        >
          <span style={{ fontSize: 14 }}>{emoji}</span>
          <span style={{ fontFamily: 'Inter', fontWeight: 600 }}>{ids.length}</span>
        </button>
      ))}
    </div>
  )
}
