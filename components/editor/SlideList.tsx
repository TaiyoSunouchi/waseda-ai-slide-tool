'use client'

import { Slide } from '@/lib/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SlideListProps {
  slides: Slide[]
  selectedId: string
  onSelect: (id: string) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

interface SortableSlideItemProps {
  slide: Slide
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function SortableSlideItem({ slide, index, isSelected, onSelect, onDelete }: SortableSlideItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const layoutLabel: Record<string, string> = {
    title: 'タイトル',
    section: 'セクション',
    content: 'コンテンツ',
    'two-column': '2カラム',
    image: '画像',
    summary: 'まとめ',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-[#8C0D3F] bg-[#8C0D3F]/5'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={() => onSelect(slide.id)}
    >
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>

      <div className="pl-8 pr-8 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400 font-mono">{index + 1}</span>
          <span className="text-xs px-1.5 py-0.5 bg-[#8C0D3F]/10 text-[#8C0D3F] rounded font-medium">
            {layoutLabel[slide.layout] || slide.layout}
          </span>
        </div>
        <p className="text-sm text-gray-900 truncate font-medium">{slide.title || '（タイトルなし）'}</p>
        {slide.body.length > 0 && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{slide.body[0]}</p>
        )}
      </div>

      {/* 削除ボタン */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(slide.id)
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="削除"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function SlideList({ slides, selectedId, onSelect, onReorder, onAdd, onDelete }: SlideListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = slides.findIndex((s) => s.id === active.id)
    const newIndex = slides.findIndex((s) => s.id === over.id)
    onReorder(oldIndex, newIndex)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          スライド一覧 <span className="text-gray-400">({slides.length})</span>
        </span>
        <button
          onClick={onAdd}
          className="text-xs px-2 py-1 bg-[#8C0D3F] hover:bg-[#A01050] text-white rounded transition-colors"
        >
          + 追加
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {slides.map((slide, index) => (
              <SortableSlideItem
                key={slide.id}
                slide={slide}
                index={index}
                isSelected={slide.id === selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
