import FontScaleInitializer from '@/components/FontScaleInitializer'
import ConditionalBottomNav from '@/components/layout/ConditionalBottomNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <FontScaleInitializer />
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {children}
        </div>
        <ConditionalBottomNav />
      </div>
    </>
  )
}
