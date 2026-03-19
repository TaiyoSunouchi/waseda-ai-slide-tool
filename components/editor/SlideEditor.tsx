'use client'

import { useState, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { v4 as uuidv4 } from 'uuid'
import { Presentation, Slide } from '@/lib/types'
import SlideList from './SlideList'
import SlideCanvas from './SlideCanvas'
import SlideProperties from './SlideProperties'
import Toolbar from './Toolbar'
import { useRouter } from 'next/navigation'

interface SlideEditorProps {
  initialPresentation: Presentation
}

export default function SlideEditor({ initialPresentation }: SlideEditorProps) {
  const router = useRouter()
  const [presentation, setPresentation] = useState<Presentation>(initialPresentation)
  const [selectedId, setSelectedId] = useState<string>(initialPresentation.slides[0]?.id || '')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | null>(null)

  const selectedSlide = presentation.slides.find((s) => s.id === selectedId)

  const updateSlide = useCallback((id: string, updates: Partial<Slide>) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }))
    setSaveStatus('unsaved')
  }, [])

  const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
    setPresentation((prev) => ({
      ...prev,
      slides: arrayMove(prev.slides, oldIndex, newIndex),
    }))
    setSaveStatus('unsaved')
  }, [])

  const handleAddSlide = useCallback(() => {
    const newSlide: Slide = {
      id: uuidv4(),
      layout: 'content',
      title: '新しいスライド',
      body: ['ポイントを入力してください'],
    }
    setPresentation((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }))
    setSelectedId(newSlide.id)
    setSaveStatus('unsaved')
  }, [])

  const handleDeleteSlide = useCallback(
    (id: string) => {
      if (presentation.slides.length <= 1) return
      setPresentation((prev) => ({
        ...prev,
        slides: prev.slides.filter((s) => s.id !== id),
      }))
      if (selectedId === id) {
        const remaining = presentation.slides.filter((s) => s.id !== id)
        setSelectedId(remaining[0]?.id || '')
      }
      setSaveStatus('unsaved')
    },
    [presentation.slides, selectedId]
  )

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const current = presentation
      let res: Response
      if (current.id) {
        res = await fetch(`/api/presentations/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
        })
      } else {
        res = await fetch('/api/presentations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
        })
      }
      if (res.ok) {
        const saved = await res.json()
        setPresentation(saved)
        sessionStorage.setItem('presentation', JSON.stringify(saved))
        setSaveStatus('saved')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presentation),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'エクスポートに失敗しました')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${presentation.title || 'presentation'}.pptx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'エクスポートに失敗しました')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="ホームに戻る"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-[#8C0D3F] font-bold text-sm">早稲田AI研究会</span>
          <span className="text-gray-300 text-sm">/</span>
          <input
            type="text"
            value={presentation.title}
            onChange={(e) => setPresentation((prev) => ({ ...prev, title: e.target.value }))}
            className="bg-transparent text-gray-900 text-sm font-medium focus:outline-none border-b border-transparent focus:border-gray-400 px-1"
          />
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-green-600 text-xs">保存済み ✓</span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-amber-500 text-xs">未保存の変更あり</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 disabled:text-gray-400 text-sm rounded border border-gray-200 transition-colors"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                保存中...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                保存
              </>
            )}
          </button>
          {exportError && (
            <span className="text-red-500 text-xs">{exportError}</span>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#8C0D3F] hover:bg-[#A01050] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm rounded transition-colors"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                出力中...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PPTXダウンロード
              </>
            )}
          </button>
        </div>
      </header>

      {/* 3ペインレイアウト */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: スライドリスト */}
        <div className="w-52 flex-shrink-0 bg-gray-50 border-r border-gray-200">
          <SlideList
            slides={presentation.slides}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={handleReorder}
            onAdd={handleAddSlide}
            onDelete={handleDeleteSlide}
          />
        </div>

        {/* 中央: ツールバー + 編集可能キャンバス */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedSlide && (
            <Toolbar
              slide={selectedSlide}
              onChange={(updates) => updateSlide(selectedSlide.id, updates)}
            />
          )}
          <div className="flex-1 overflow-hidden">
            {selectedSlide ? (
              <SlideCanvas
                slide={selectedSlide}
                onChange={(updates) => updateSlide(selectedSlide.id, updates)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                スライドを選択してください
              </div>
            )}
          </div>
        </div>

        {/* 右: プロパティ */}
        <div className="w-72 flex-shrink-0 bg-gray-50 border-l border-gray-200">
          {selectedSlide ? (
            <SlideProperties
              slide={selectedSlide}
              onChange={(updates) => updateSlide(selectedSlide.id, updates)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4 text-center">
              スライドを選択すると編集できます
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
