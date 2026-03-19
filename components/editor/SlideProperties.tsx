'use client'

import { useState } from 'react'
import { Slide, SlideLayout } from '@/lib/types'
import { useDropzone } from 'react-dropzone'

interface SlidePropertiesProps {
  slide: Slide
  onChange: (updated: Partial<Slide>) => void
}

const LAYOUTS: { value: SlideLayout; label: string }[] = [
  { value: 'title', label: 'タイトル' },
  { value: 'section', label: 'セクション' },
  { value: 'content', label: 'コンテンツ' },
  { value: 'two-column', label: '2カラム' },
  { value: 'image', label: '画像' },
  { value: 'summary', label: 'まとめ' },
]

export default function SlideProperties({ slide, onChange }: SlidePropertiesProps) {
  const [bodyText, setBodyText] = useState(slide.body.join('\n'))

  const handleBodyBlur = () => {
    onChange({ body: bodyText.split('\n').filter((l) => l.trim()) })
  }

  const handleBodyChange = (val: string) => {
    setBodyText(val)
  }

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    const reader = new FileReader()
    reader.onload = () => {
      // image レイアウト以外ならレイアウトも切り替えて画像を表示する
      const updates: Parameters<typeof onChange>[0] = { imageUrl: reader.result as string }
      if (slide.layout !== 'image') updates.layout = 'image'
      onChange(updates)
    }
    reader.readAsDataURL(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  })

  // bodyTextをslide.bodyが変わったら同期
  const currentBody = slide.body.join('\n')
  if (bodyText !== currentBody && document.activeElement?.tagName !== 'TEXTAREA') {
    setBodyText(currentBody)
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          スライドプロパティ
        </h3>
      </div>

      {/* レイアウト */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">レイアウト</label>
        <select
          value={slide.layout}
          onChange={(e) => onChange({ layout: e.target.value as SlideLayout })}
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-[#8C0D3F] focus:ring-1 focus:ring-[#8C0D3F]"
        >
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* タイトル */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">タイトル</label>
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-[#8C0D3F] focus:ring-1 focus:ring-[#8C0D3F]"
          placeholder="スライドタイトル"
        />
      </div>

      {/* 本文 */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          本文（1行1アイテム）
        </label>
        <textarea
          value={bodyText}
          onChange={(e) => handleBodyChange(e.target.value)}
          onBlur={handleBodyBlur}
          rows={6}
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:border-[#8C0D3F] focus:ring-1 focus:ring-[#8C0D3F] resize-none"
          placeholder="各行がひとつの箇条書きになります"
        />
      </div>

      {/* 画像（全レイアウト対応） */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">画像</label>
        {slide.layout !== 'image' && !slide.imageUrl && (
          <p className="text-xs text-gray-400 mb-2">
            画像をアップロードすると自動で「画像」レイアウトに切り替わります
          </p>
        )}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-[#8C0D3F] bg-red-50'
              : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          {slide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.imageUrl}
              alt="preview"
              className="max-h-32 mx-auto object-contain rounded"
            />
          ) : (
            <div className="py-2">
              <svg className="mx-auto h-7 w-7 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-xs">クリックまたはドラッグで画像を追加</p>
              <p className="text-gray-400 text-xs mt-0.5">JPG, PNG, GIF, WebP</p>
            </div>
          )}
        </div>
        {slide.imageUrl && (
          <button
            onClick={() => onChange({ imageUrl: undefined })}
            className="mt-2 text-xs text-red-500 hover:text-red-600"
          >
            画像を削除
          </button>
        )}
      </div>

      {/* 発表者メモ */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">発表者メモ（任意）</label>
        <textarea
          value={slide.notes || ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded bg-white border border-gray-300 text-gray-600 text-sm focus:outline-none focus:border-[#8C0D3F] focus:ring-1 focus:ring-[#8C0D3F] resize-none"
          placeholder="発表時のメモ"
        />
      </div>
    </div>
  )
}
