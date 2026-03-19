'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { SlideImage } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  images: SlideImage[]
  onChange: (images: SlideImage[]) => void
}

const HANDLE_SIZE = 8
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
type Dir = (typeof HANDLES)[number]

const CURSOR: Record<Dir, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize',   se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
}

function hPos(dir: Dir, w: number, h: number) {
  const cx = dir.includes('e') ? w : dir.includes('w') ? 0 : w / 2
  const cy = dir.includes('s') ? h : dir.includes('n') ? 0 : h / 2
  return { left: cx - HANDLE_SIZE / 2, top: cy - HANDLE_SIZE / 2 }
}

type DragState = {
  type: 'move' | 'resize'
  imgId: string
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
  handle?: Dir
}

export default function FloatingImageLayer({ images, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<DragState | null>(null)
  // Refs so drag handlers always see latest values without stale closures
  const imagesRef = useRef(images)
  const onChangeRef = useRef(onChange)
  imagesRef.current = images
  onChangeRef.current = onChange

  const doUpdate = useCallback((id: string, updates: Partial<SlideImage>) => {
    onChangeRef.current(
      imagesRef.current.map((img) => (img.id === id ? { ...img, ...updates } : img))
    )
  }, [])

  const handleDragMove = useCallback((ev: PointerEvent) => {
    const ds = dragState.current
    if (!ds) return
    const dx = ev.clientX - ds.startX
    const dy = ev.clientY - ds.startY
    const MIN = 24

    if (ds.type === 'move') {
      doUpdate(ds.imgId, {
        x: Math.max(0, Math.min(800 - ds.origW, ds.origX + dx)),
        y: Math.max(0, Math.min(450 - ds.origH, ds.origY + dy)),
      })
    } else if (ds.type === 'resize' && ds.handle) {
      const dir = ds.handle
      let w = ds.origW
      let h = ds.origH
      let x = ds.origX
      let y = ds.origY

      if (dir.includes('e')) w = Math.max(MIN, ds.origW + dx)
      if (dir.includes('s')) h = Math.max(MIN, ds.origH + dy)
      if (dir.includes('w')) { w = Math.max(MIN, ds.origW - dx); x = ds.origX + ds.origW - w }
      if (dir.includes('n')) { h = Math.max(MIN, ds.origH - dy); y = ds.origY + ds.origH - h }

      doUpdate(ds.imgId, { x, y, width: w, height: h })
    }
  }, [doUpdate])

  const startDrag = (
    type: 'move' | 'resize',
    imgId: string,
    e: React.PointerEvent,
    handle?: Dir
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const img = imagesRef.current.find((i) => i.id === imgId)
    if (!img) return
    dragState.current = {
      type, imgId, handle,
      startX: e.clientX, startY: e.clientY,
      origX: img.x, origY: img.y, origW: img.width, origH: img.height,
    }
    const handleUp = () => {
      dragState.current = null
      document.removeEventListener('pointermove', handleDragMove)
      document.removeEventListener('pointerup', handleUp)
    }
    document.addEventListener('pointermove', handleDragMove)
    document.addEventListener('pointerup', handleUp)
  }

  // Click outside to deselect
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (layerRef.current && !layerRef.current.contains(e.target as Node)) {
        setSelectedId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard: Delete removes selected image, Escape deselects
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedId) return
      if (e.key === 'Delete') {
        e.preventDefault()
        onChangeRef.current(imagesRef.current.filter((img) => img.id !== selectedId))
        setSelectedId(null)
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedId])

  const handleInsert = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const imgs = imagesRef.current
      const maxZ = imgs.length > 0 ? Math.max(...imgs.map((i) => i.zIndex)) : 0
      const newImg: SlideImage = {
        id: uuidv4(),
        dataUrl: reader.result as string,
        x: 100, y: 80,
        width: 320, height: 200,
        zIndex: maxZ + 1,
      }
      onChangeRef.current([...imgs, newImg])
      setSelectedId(newImg.id)
    }
    reader.readAsDataURL(file)
  }

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...imagesRef.current.map((i) => i.zIndex))
    doUpdate(id, { zIndex: maxZ + 1 })
  }

  const sendToBack = (id: string) => {
    const minZ = Math.min(...imagesRef.current.map((i) => i.zIndex))
    doUpdate(id, { zIndex: minZ - 1 })
  }

  const deleteImg = (id: string) => {
    onChangeRef.current(imagesRef.current.filter((img) => img.id !== id))
    setSelectedId(null)
  }

  const sorted = [...images].sort((a, b) => a.zIndex - b.zIndex)

  return (
    <div
      ref={layerRef}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', zIndex: 10 }}
    >
      {/* Insert Image Button — always visible when editing */}
      <div style={{ pointerEvents: 'all', position: 'absolute', top: 8, left: 8, zIndex: 100 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 hover:bg-white border border-gray-300 rounded-lg shadow-md text-xs text-gray-700 font-medium transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          画像を挿入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) { handleInsert(f); e.target.value = '' }
          }}
        />
      </div>

      {/* Floating Images */}
      {sorted.map((img) => {
        const isSelected = img.id === selectedId
        return (
          <div
            key={img.id}
            style={{
              pointerEvents: 'all',
              position: 'absolute',
              left: img.x,
              top: img.y,
              width: img.width,
              height: img.height,
              // Selected image gets z-index 999 so its toolbar is always on top
              zIndex: isSelected ? 999 : img.zIndex + 10,
              outline: isSelected ? '2px solid #2563EB' : '1px solid rgba(0,0,0,0)',
              cursor: 'move',
              userSelect: 'none',
            }}
            onPointerDown={(e) => {
              setSelectedId(img.id)
              startDrag('move', img.id, e)
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.dataUrl}
              alt="floating"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
              draggable={false}
            />

            {isSelected && (
              <>
                {/* Floating Toolbar */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0,
                    background: '#1A1A2E',
                    border: '1px solid #374151',
                    borderRadius: 6,
                    padding: '2px 4px',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); bringToFront(img.id) }}
                    className="text-xs text-white hover:text-[#F97316] px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                    title="最前面へ"
                  >
                    前面へ
                  </button>
                  <span className="text-gray-600 text-xs">|</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); sendToBack(img.id) }}
                    className="text-xs text-white hover:text-[#F97316] px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                    title="最背面へ"
                  >
                    背面へ
                  </button>
                  <span className="text-gray-600 text-xs">|</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteImg(img.id) }}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                    title="削除 (Delete)"
                  >
                    削除
                  </button>
                </div>

                {/* 8 Resize Handles */}
                {HANDLES.map((dir) => {
                  const pos = hPos(dir, img.width, img.height)
                  return (
                    <div
                      key={dir}
                      style={{
                        position: 'absolute',
                        left: pos.left,
                        top: pos.top,
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        background: 'white',
                        border: '1.5px solid #2563EB',
                        borderRadius: 2,
                        cursor: CURSOR[dir],
                        zIndex: 1001,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        startDrag('resize', img.id, e, dir)
                      }}
                    />
                  )
                })}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
