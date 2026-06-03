import FontScaleInitializer from '@/components/FontScaleInitializer'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <FontScaleInitializer />
      {children}
    </>
  )
}
