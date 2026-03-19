'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { Presentation } from '@/lib/types'

export default function UploadForm() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: true,
  })

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('講義内容を入力してください')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const imageUrls = await Promise.all(
        images.map((img) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(img.file)
          })
        )
      )

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, imageUrls }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'スライド生成に失敗しました')
      }

      const presentation: Presentation = await res.json()

      let imgIdx = 0
      for (const slide of presentation.slides) {
        if (slide.layout === 'image' && imgIdx < imageUrls.length) {
          slide.imageUrl = imageUrls[imgIdx++]
        }
      }

      const saveRes = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presentation),
      })
      const saved: Presentation = saveRes.ok ? await saveRes.json() : presentation

      sessionStorage.setItem('presentation', JSON.stringify(saved))
      router.push('/editor')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* テキスト入力 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          講義内容・概要
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="講義のテーマ、内容、学習目標などを自由に記述してください。AIが自動的にスライド構成を生成します。"
          rows={8}
          className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#8C0D3F] focus:ring-1 focus:ring-[#8C0D3F] resize-none text-sm transition-colors"
        />
        <div className="mt-1.5 text-right text-xs text-gray-400">
          {text.length} 文字
        </div>
      </div>

      {/* 画像アップロード */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          参考画像
          <span className="text-gray-400 font-normal ml-1">（任意）</span>
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-[#8C0D3F] bg-red-50'
              : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <svg className="mx-auto h-8 w-8 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">
            {isDragActive ? 'ここにドロップ' : 'ドラッグ&ドロップ、またはクリックして選択'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP</p>
        </div>

        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2.5">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`upload-${i}`}
                  className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 bg-white border border-gray-200 text-gray-500 hover:text-red-500 rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* エラー */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 生成ボタン */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !text.trim()}
        className="w-full py-3.5 bg-[#8C0D3F] hover:bg-[#A01050] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            AIがスライドを生成中...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            スライドを生成
          </>
        )}
      </button>
    </div>
  )
}
