'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Slide, SlideImage } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'
import { applyFontFamily, applyFontSizePx, applyColor, dispatchInputEvent } from '@/lib/selectionUtils'

const FONTS: { label: string; value: string }[] = [
  { label: 'ゴシック',       value: 'Noto Sans JP' },
  { label: '明朝体',         value: 'Noto Serif JP' },
  { label: '丸ゴシック',     value: 'M PLUS Rounded 1c' },
  { label: 'BIZ UDゴシック', value: 'BIZ UDPGothic' },
  { label: '角ゴシック',     value: 'Zen Kaku Gothic New' },
]

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40]

const TEXT_COLORS = [
  { label: '黒',           value: '#111827' },
  { label: 'ダークグレー', value: '#374151' },
  { label: 'グレー',       value: '#6B7280' },
  { label: '赤',           value: '#EF4444' },
  { label: 'オレンジ',     value: '#F97316' },
  { label: '黄',           value: '#F59E0B' },
  { label: '緑',           value: '#10B981' },
  { label: '青',           value: '#2563EB' },
  { label: 'パープル',     value: '#8B5CF6' },
  { label: '深紅',         value: '#8C0D3F' },
  { label: '白',           value: '#FFFFFF' },
]

// ── カスタムドロップダウン ──────────────────────────────────────────────────
// onMouseDown + preventDefault を全インタラクションに使用し、
// contenteditable のフォーカス・選択を維持する。
// createPortal + position:fixed で overflow:hidden によるクリップを回避。
function DropMenu({
  label,
  options,
  onSelect,
  minWidth = 90,
}: {
  label: string
  options: { label: string; value: string }[]
  onSelect: (value: string) => void
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // ドロップダウン外クリックで閉じる（preventDefault なし → contenteditable への通常クリックを妨げない）
  useEffect(() => {
    if (!open) return
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || dropRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [open])

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault() // フォーカスを contenteditable から奪わない
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 2, left: rect.left })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseDown={toggle}
        className="px-2 py-0.5 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:border-gray-400 transition-colors flex items-center gap-1.5 whitespace-nowrap"
        style={{ minWidth }}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <svg className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, minWidth }}
          className="bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault() // フォーカスを奪わない
                onSelect(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

interface ToolbarProps {
  slide: Slide
  onChange: (updates: Partial<Slide>) => void
}

export default function Toolbar({ slide, onChange }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 画像挿入 ──────────────────────────────────────────────────────────────
  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const current = slide.floatingImages || []
      const maxZ = current.length > 0 ? Math.max(...current.map((i) => i.zIndex)) : 0
      const newImg: SlideImage = {
        id: uuidv4(),
        dataUrl: reader.result as string,
        x: 100, y: 80, width: 320, height: 200,
        zIndex: maxZ + 1,
      }
      onChange({ floatingImages: [...current, newImg] })
    }
    reader.readAsDataURL(file)
  }

  // ── フォント変更 ───────────────────────────────────────────────────────────
  // onMouseDown+preventDefault により contenteditable のフォーカス・選択が維持されているため、
  // window.getSelection() に直接アクセスできる（restoreRange 不要）
  const handleFontSelect = (fontFamily: string) => {
    const applied = applyFontFamily(fontFamily)
    if (applied) dispatchInputEvent()
    onChange({ fontFamily })
  }

  // ── 文字サイズ変更 ─────────────────────────────────────────────────────────
  const handleSizeSelect = (sizeStr: string) => {
    if (!sizeStr) { onChange({ bodyFontSize: undefined }); return }
    const size = Number(sizeStr)
    const applied = applyFontSizePx(size)
    if (applied) dispatchInputEvent()
    onChange({ bodyFontSize: size })
  }

  // ── 文字色変更 ─────────────────────────────────────────────────────────────
  const handleColorMouseDown = (e: React.MouseEvent, color: string) => {
    e.preventDefault()
    const applied = applyColor(color)
    if (applied) dispatchInputEvent()
  }

  const currentFontLabel = FONTS.find(f => f.value === (slide.fontFamily || 'Noto Sans JP'))?.label ?? 'ゴシック'
  const currentSizeLabel = slide.bodyFontSize != null ? `${slide.bodyFontSize} pt` : '自動'

  const fontOptions = FONTS.map(f => ({ label: f.label, value: f.value }))
  const sizeOptions = [
    { label: '自動', value: '' },
    ...FONT_SIZES.map(s => ({ label: `${s} pt`, value: String(s) })),
  ]

  return (
    <div className="flex items-center gap-0.5 px-3 py-1 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap min-h-[36px]">

      {/* 画像挿入 */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        title="フロート画像を挿入"
      >
        <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        画像
      </button>
      <input
        ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImageFile(f); e.target.value = '' } }}
      />

      <div className="w-px h-4 bg-gray-200 mx-1.5" />

      {/* フォント */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 select-none">フォント</span>
        <DropMenu label={currentFontLabel} options={fontOptions} onSelect={handleFontSelect} minWidth={112} />
      </div>

      <div className="w-px h-4 bg-gray-200 mx-1.5" />

      {/* 文字サイズ */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 select-none">サイズ</span>
        <DropMenu label={currentSizeLabel} options={sizeOptions} onSelect={handleSizeSelect} minWidth={72} />
      </div>

      <div className="w-px h-4 bg-gray-200 mx-1.5" />

      {/* 文字色 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 select-none">色</span>
        <div className="flex items-center gap-0.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300 hover:scale-125 transition-transform"
              style={{ backgroundColor: c.value }}
              onMouseDown={(e) => handleColorMouseDown(e, c.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
