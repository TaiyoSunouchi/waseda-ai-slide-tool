'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Presentation } from '@/lib/types'
import SlideEditor from '@/components/editor/SlideEditor'

export default function EditorPage() {
  const router = useRouter()
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('presentation')
    if (!stored) {
      setError('プレゼンテーションデータが見つかりません')
      return
    }
    try {
      const parsed = JSON.parse(stored) as Presentation
      setPresentation(parsed)
    } catch {
      setError('データの読み込みに失敗しました')
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[#8C0D3F] hover:bg-[#B01050] text-white rounded"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  if (!presentation) {
    return (
      <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>読み込み中...</span>
        </div>
      </div>
    )
  }

  return <SlideEditor initialPresentation={presentation} />
}
