// Animated three-dot loading indicator
export function LoadingDots({ color = 'var(--mute)', size = 6 }: { color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: size * 0.6, alignItems: 'center', color }}>
      <span className="loading-dot" style={{ width: size, height: size }} />
      <span className="loading-dot" style={{ width: size, height: size }} />
      <span className="loading-dot" style={{ width: size, height: size }} />
    </span>
  )
}

// Full-screen centered loading state
export function PageLoading() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--off)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <LoadingDots color="var(--g2)" size={10} />
    </div>
  )
}

// Inline section loading (padded center)
export function SectionLoading({ text, padding = '40px 0' }: { text?: string; padding?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding }}>
      <LoadingDots color="var(--g3)" size={8} />
      {text && <div style={{ fontSize: 12, color: 'var(--mute)' }}>{text}</div>}
    </div>
  )
}

// Tiny inline loading (for comments etc.)
export function InlineLoading() {
  return (
    <div style={{ padding: '4px 0' }}>
      <LoadingDots color="var(--mute)" size={5} />
    </div>
  )
}
