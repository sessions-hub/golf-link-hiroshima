import FontScaleInitializer from '@/components/FontScaleInitializer'
import ConditionalBottomNav from '@/components/layout/ConditionalBottomNav'
import LaunchGate from '@/components/LaunchGate'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FontScaleInitializer />
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <LaunchGate>{children}</LaunchGate>
        </div>
        <ConditionalBottomNav />
      </div>
    </>
  )
}
