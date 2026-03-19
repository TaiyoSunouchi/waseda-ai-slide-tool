'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Presentation } from '@/lib/types'

export default function PresentationHistory() {
  const router = useRouter()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchList = async () => {
    try {
      const res = await fetch('/api/presentations')
      if (res.ok) {
        setPresentations(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleEdit = (p: Presentation) => {
    sessionStorage.setItem('presentation', JSON.stringify(p))
    router.push('/editor')
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/presentations/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPresentations((prev) => prev.filter((p) => p.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        読み込み中...
      </div>
    )
  }

  if (presentations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        保存済みのプレゼンテーションはありません
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {presentations.map((p) => (
        <div
          key={p.id}
          className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-[#8C0D3F]/40 hover:shadow-sm transition-all"
        >
          <div className="flex-1">
            <h3 className="text-gray-900 font-semibold text-sm leading-tight line-clamp-2 mb-1">
              {p.title || '無題のプレゼンテーション'}
            </h3>
            <p className="text-gray-400 text-xs">{p.slides.length} スライド</p>
            {p.updatedAt && (
              <p className="text-gray-400 text-xs mt-1">{formatDate(p.updatedAt)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEdit(p)}
              className="flex-1 py-1.5 bg-[#8C0D3F] hover:bg-[#A01050] text-white text-xs rounded-lg transition-colors font-medium"
            >
              編集
            </button>
            <button
              onClick={() => p.id && handleDelete(p.id)}
              disabled={deletingId === p.id}
              className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 border border-gray-200 hover:border-red-200 disabled:opacity-50 text-gray-500 text-xs rounded-lg transition-colors"
            >
              {deletingId === p.id ? '削除中...' : '削除'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
