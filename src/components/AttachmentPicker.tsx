'use client'
import { useRef, useState } from 'react'

interface AttachmentPickerProps {
  onImageSelect: (file: File) => void
  onFileSelect: (file: File) => void
}

export default function AttachmentPicker({ onImageSelect, onFileSelect }: AttachmentPickerProps) {
  const [open, setOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    imageInputRef.current?.click()
    setOpen(false)
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surf)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 16 }}
      >
        📎
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300 }}
          />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: 'white', borderRadius: '20px 20px 0 0', padding: '12px 0 calc(env(safe-area-inset-bottom) + 12px)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)', margin: '0 auto 12px' }} />
            <button
              type="button"
              onClick={handleImageClick}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--txt)', textAlign: 'left' }}
            >
              📷 写真を選択
            </button>
            <button
              type="button"
              onClick={handleFileClick}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--txt)', textAlign: 'left' }}
            >
              📄 PDFを選択
            </button>
            <div style={{ height: 1, background: 'var(--line)', margin: '4px 16px' }} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--mute)' }}
            >
              キャンセル
            </button>
          </div>
        </>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImageSelect(file)
          e.target.value = ''
        }}
        style={{ display: 'none' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
          e.target.value = ''
        }}
        style={{ display: 'none' }}
      />
    </>
  )
}
