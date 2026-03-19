'use client'

import { useRef, useLayoutEffect, useEffect } from 'react'
import { Slide, SlideImage } from '@/lib/types'
import FloatingImageLayer from './FloatingImageLayer'
import { initSelectionTracking } from '@/lib/selectionUtils'
import { v4 as uuidv4 } from 'uuid'

interface SlideCanvasProps {
  slide: Slide
  onChange?: (updates: Partial<Slide>) => void
}

export default function SlideCanvas({ slide, onChange }: SlideCanvasProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-gray-100">
      <div
        className="relative shadow-2xl"
        style={{ width: '800px', height: '450px', flexShrink: 0 }}
      >
        <SlideRenderer slide={slide} onChange={onChange} />
        {onChange && (
          <FloatingImageLayer
            images={slide.floatingImages || []}
            onChange={(imgs: SlideImage[]) => onChange({ floatingImages: imgs })}
          />
        )}
      </div>
    </div>
  )
}

type SlideProps = { slide: Slide; onChange?: (updates: Partial<Slide>) => void }

function SlideRenderer({ slide, onChange }: SlideProps) {
  switch (slide.layout) {
    case 'title':      return <TitleSlide      slide={slide} onChange={onChange} />
    case 'section':    return <SectionSlide    slide={slide} onChange={onChange} />
    case 'two-column': return <TwoColumnSlide  slide={slide} onChange={onChange} />
    case 'summary':    return <SummarySlide    slide={slide} onChange={onChange} />
    case 'image':      return <ImageSlide      slide={slide} onChange={onChange} />
    case 'content':
    default:           return <ContentSlide    slide={slide} onChange={onChange} />
  }
}

// ─── ロゴ ─────────────────────────────────────────────────────────────────────
function Logo() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="早稲田AI研究会" style={{ height: '20px', width: 'auto' }} />
}
function LogoOnColor() {
  return (
    <div className="bg-white/90 rounded px-2 py-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="早稲田AI研究会" style={{ height: '18px', width: 'auto' }} />
    </div>
  )
}

// ─── スタイルスケーリング ─────────────────────────────────────────────────────
function getContentStyle(count: number): { textClass: string; gapClass: string } {
  if (count <= 2) return { textClass: 'text-xl',   gapClass: 'space-y-7' }
  if (count <= 3) return { textClass: 'text-lg',   gapClass: 'space-y-5' }
  if (count <= 5) return { textClass: 'text-base', gapClass: 'space-y-4' }
  if (count <= 7) return { textClass: 'text-base', gapClass: 'space-y-2' }
  return               { textClass: 'text-sm',   gapClass: 'space-y-1' }
}
function getTwoColStyle(maxColCount: number): { textClass: string; gapClass: string } {
  if (maxColCount <= 2) return { textClass: 'text-base', gapClass: 'space-y-5' }
  if (maxColCount <= 3) return { textClass: 'text-sm',   gapClass: 'space-y-3' }
  if (maxColCount <= 5) return { textClass: 'text-sm',   gapClass: 'space-y-2' }
  return                    { textClass: 'text-xs',   gapClass: 'space-y-1' }
}
function getSummaryStyle(count: number): {
  textClass: string; gapClass: string; circleClass: string; numClass: string
} {
  if (count <= 2) return { textClass: 'text-xl',   gapClass: 'space-y-7', circleClass: 'w-8 h-8', numClass: 'text-sm'  }
  if (count <= 3) return { textClass: 'text-lg',   gapClass: 'space-y-5', circleClass: 'w-7 h-7', numClass: 'text-xs'  }
  if (count <= 5) return { textClass: 'text-base', gapClass: 'space-y-4', circleClass: 'w-6 h-6', numClass: 'text-xs'  }
  if (count <= 7) return { textClass: 'text-base', gapClass: 'space-y-2', circleClass: 'w-6 h-6', numClass: 'text-xs'  }
  return               { textClass: 'text-sm',   gapClass: 'space-y-1', circleClass: 'w-5 h-5', numClass: 'text-xs'  }
}

// ─── リッチテキスト項目（contenteditable） ───────────────────────────────────
function RichTextItem({
  itemKey,
  html,
  onHtmlChange,
  onEnter,
  onDelete,
  bulletColor,
  textClass,
  fontSizeOverride,
}: {
  itemKey: string
  html: string
  onHtmlChange: (html: string) => void
  onEnter: () => void
  onDelete: () => void
  bulletColor: string
  textClass: string
  fontSizeOverride?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  // 外部から html が変わった時だけ DOM を更新（フォーカス中は更新しない）
  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== html) {
      el.innerHTML = html
    }
  }, [html])

  return (
    <li
      className={`flex items-start gap-3 text-gray-800 ${fontSizeOverride ? '' : textClass}`}
      style={fontSizeOverride ? { fontSize: `${fontSizeOverride}px` } : undefined}
    >
      <span style={{ color: bulletColor }} className="flex-shrink-0 leading-none mt-0.5">▶</span>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-item-key={itemKey}
        data-placeholder="テキストを入力..."
        className="flex-1 bg-transparent focus:outline-none border-b border-transparent hover:border-gray-300 focus:border-[#2563EB] transition-colors min-w-0 cursor-text break-words"
        onInput={() => { if (ref.current) onHtmlChange(ref.current.innerHTML) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onEnter() }
          if (e.key === 'Backspace' && ref.current && !ref.current.textContent) {
            e.preventDefault(); onDelete()
          }
        }}
      />
    </li>
  )
}

// ─── 編集可能ボディ項目リスト ─────────────────────────────────────────────────
function EditableBodyItems({
  body,
  gapClass,
  textClass,
  bulletColor,
  onBodyChange,
  fontSizeOverride,
}: {
  body: string[]
  gapClass: string
  textClass: string
  bulletColor: string
  onBodyChange: (body: string[]) => void
  fontSizeOverride?: number
}) {
  // selectionchange による選択追跡を初期化（一度だけ）
  useEffect(() => { initSelectionTracking() }, [])

  const containerRef = useRef<HTMLUListElement>(null)
  // 安定したキーをアイテムごとに維持（インデックス変化による DOM 再利用を防ぐ）
  const itemIds = useRef<string[]>([])
  while (itemIds.current.length < body.length) itemIds.current.push(uuidv4())
  itemIds.current.length = body.length

  const focusItem = (index: number) => {
    const key = itemIds.current[index]
    setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLDivElement>(`[data-item-key="${key}"]`)
      if (!el) return
      el.focus()
      // カーソルを末尾へ
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }, 0)
  }

  const addAfter = (i: number) => {
    itemIds.current.splice(i + 1, 0, uuidv4())
    const nb = [...body]; nb.splice(i + 1, 0, ''); onBodyChange(nb)
    focusItem(i + 1)
  }

  const remove = (i: number) => {
    if (body.length <= 1) return
    itemIds.current.splice(i, 1)
    const nb = body.filter((_, j) => j !== i); onBodyChange(nb)
    focusItem(Math.max(0, i - 1))
  }

  return (
    <ul ref={containerRef} className={gapClass}>
      {body.map((item, i) => (
        <RichTextItem
          key={itemIds.current[i]}
          itemKey={itemIds.current[i]}
          html={item}
          onHtmlChange={(html) => { const nb = [...body]; nb[i] = html; onBodyChange(nb) }}
          onEnter={() => addAfter(i)}
          onDelete={() => remove(i)}
          bulletColor={bulletColor}
          textClass={textClass}
          fontSizeOverride={fontSizeOverride}
        />
      ))}
      <li>
        <button
          type="button"
          onClick={() => addAfter(body.length - 1)}
          className="ml-6 mt-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ＋ 項目を追加
        </button>
      </li>
    </ul>
  )
}

// ─── 画像アップロードエリア ────────────────────────────────────────────────────
function ImageUploadArea({
  imageUrl,
  alt,
  onImageChange,
}: {
  imageUrl?: string
  alt: string
  onImageChange: (url: string | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => onImageChange(reader.result as string)
    reader.readAsDataURL(file)
  }
  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-pointer group"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file?.type.startsWith('image/')) handleFile(file)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFile(f); e.target.value = '' } }}
      />
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} className="max-w-full max-h-full object-contain rounded" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center rounded">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-gray-700 text-xs px-3 py-1.5 rounded-full shadow font-medium">
              クリックで画像を変更
            </span>
          </div>
        </>
      ) : (
        <div className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-lg w-full h-full flex items-center justify-center text-blue-400 hover:text-blue-500 transition-colors">
          <div className="text-center pointer-events-none">
            <svg className="mx-auto h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">クリックまたはドラッグで画像を追加</p>
            <p className="text-xs mt-1 text-blue-300">JPG, PNG, GIF, WebP</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Title ────────────────────────────────────────────────────────────────────
function TitleSlide({ slide, onChange }: SlideProps) {
  const subtitle = slide.body.join(' ')
  return (
    <div className="w-full h-full bg-white relative overflow-hidden flex" style={{ fontFamily: slide.fontFamily || 'Noto Sans JP' }}>
      <div className="w-3 bg-[#F97316] flex-shrink-0" />
      <div className="flex-1 flex flex-col items-center justify-center px-16 py-10">
        {onChange ? (
          <input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-4xl font-bold text-gray-900 text-center leading-tight mb-4 bg-transparent outline-none border-b-2 border-transparent hover:border-gray-200 focus:border-[#F97316] w-full transition-colors placeholder-gray-300"
            placeholder="タイトルを入力..."
          />
        ) : (
          <h1 className="text-4xl font-bold text-gray-900 text-center leading-tight mb-4">{slide.title}</h1>
        )}
        {onChange ? (
          <input
            value={subtitle}
            onChange={(e) => onChange({ body: e.target.value ? [e.target.value] : [] })}
            className="text-lg text-gray-500 text-center bg-transparent outline-none border-b border-transparent hover:border-gray-200 focus:border-gray-400 w-full transition-colors placeholder-gray-300"
            placeholder="サブタイトルを入力..."
          />
        ) : (
          subtitle && <p className="text-lg text-gray-500 text-center">{subtitle}</p>
        )}
      </div>
      <div className="w-3 bg-[#2563EB] flex-shrink-0" />
      <div className="absolute bottom-4 right-6"><Logo /></div>
      <div className="absolute bottom-0 left-3 right-3 h-1 bg-[#2563EB]" />
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function SectionSlide({ slide, onChange }: SlideProps) {
  return (
    <div className="w-full h-full bg-[#2563EB] relative overflow-hidden flex items-center justify-center" style={{ fontFamily: slide.fontFamily || 'Noto Sans JP' }}>
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#F97316]" />
      {onChange ? (
        <input
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="text-3xl font-bold text-white text-center bg-transparent outline-none border-b-2 border-white/0 hover:border-white/40 focus:border-white/80 px-16 w-full transition-colors placeholder-white/50"
          placeholder="セクション名を入力..."
        />
      ) : (
        <h2 className="text-3xl font-bold text-white text-center px-16">{slide.title}</h2>
      )}
      <div className="absolute bottom-4 right-6"><LogoOnColor /></div>
    </div>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────
function ContentSlide({ slide, onChange }: SlideProps) {
  const { textClass, gapClass } = getContentStyle(slide.body.length)
  return (
    <div className="w-full h-full bg-white flex flex-col relative" style={{ fontFamily: slide.fontFamily || 'Noto Sans JP' }}>
      <div className="bg-[#F97316] px-8 py-4 flex-shrink-0">
        {onChange ? (
          <input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-2xl font-bold text-white bg-transparent outline-none border-b border-white/0 hover:border-white/50 focus:border-white w-full transition-colors placeholder-white/60"
            placeholder="タイトルを入力..."
          />
        ) : (
          <h2 className="text-2xl font-bold text-white truncate">{slide.title}</h2>
        )}
      </div>
      <div className="h-1 bg-[#2563EB] flex-shrink-0" />
      <div className="flex-1 px-8 py-6 overflow-hidden flex flex-col justify-center">
        {onChange ? (
          <EditableBodyItems
            body={slide.body}
            gapClass={gapClass}
            textClass={textClass}
            bulletColor="#2563EB"
            onBodyChange={(body) => onChange({ body })}
            fontSizeOverride={slide.bodyFontSize}
          />
        ) : (
          <ul className={gapClass}>
            {slide.body.map((item, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 text-gray-800 ${slide.bodyFontSize ? '' : textClass}`}
                style={slide.bodyFontSize ? { fontSize: `${slide.bodyFontSize}px` } : undefined}
              >
                <span className="text-[#2563EB] mt-1 flex-shrink-0">▶</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="absolute bottom-3 right-5"><Logo /></div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316]/40" />
    </div>
  )
}

// ─── Two-Column ───────────────────────────────────────────────────────────────
function TwoColumnSlide({ slide, onChange }: SlideProps) {
  const half = Math.ceil(slide.body.length / 2)
  const left = slide.body.slice(0, half)
  const right = slide.body.slice(half)
  const { textClass, gapClass } = getTwoColStyle(Math.max(left.length, right.length))

  return (
    <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: slide.fontFamily || 'Noto Sans JP' }}>
      <div className="bg-[#F97316] px-8 py-4 flex-shrink-0">
        {onChange ? (
          <input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-2xl font-bold text-white bg-transparent outline-none border-b border-white/0 hover:border-white/50 focus:border-white w-full transition-colors placeholder-white/60"
            placeholder="タイトルを入力..."
          />
        ) : (
          <h2 className="text-2xl font-bold text-white truncate">{slide.title}</h2>
        )}
      </div>
      <div className="h-1 bg-[#2563EB] flex-shrink-0" />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 px-6 py-4 overflow-hidden flex flex-col justify-center">
          {onChange ? (
            <EditableBodyItems
              body={left}
              gapClass={gapClass}
              textClass={textClass}
              bulletColor="#2563EB"
              onBodyChange={(newLeft) => onChange({ body: [...newLeft, ...right] })}
              fontSizeOverride={slide.bodyFontSize}
            />
          ) : (
            <ul className={gapClass}>
              {left.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-gray-800 ${slide.bodyFontSize ? '' : textClass}`}
                  style={slide.bodyFontSize ? { fontSize: `${slide.bodyFontSize}px` } : undefined}
                >
                  <span className="text-[#2563EB] flex-shrink-0">▶</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="w-px bg-[#2563EB]/30 my-4" />
        <div className="flex-1 px-6 py-4 overflow-hidden flex flex-col justify-center">
          {onChange ? (
            <EditableBodyItems
              body={right.length > 0 ? right : ['']}
              gapClass={gapClass}
              textClass={textClass}
              bulletColor="#F97316"
              onBodyChange={(newRight) => onChange({ body: [...left, ...newRight] })}
              fontSizeOverride={slide.bodyFontSize}
            />
          ) : (
            <ul className={gapClass}>
              {right.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-gray-800 ${slide.bodyFontSize ? '' : textClass}`}
                  style={slide.bodyFontSize ? { fontSize: `${slide.bodyFontSize}px` } : undefined}
                >
                  <span className="text-[#F97316] flex-shrink-0">▶</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="absolute bottom-3 right-5"><Logo /></div>
    </div>
  )
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function SummarySlide({ slide, onChange }: SlideProps) {
  const { textClass, gapClass, circleClass, numClass } = getSummaryStyle(slide.body.length)
  return (
    <div className="w-full h-full bg-gray-50 flex flex-col relative" style={{ fontFamily: slide.fontFamily || 'Noto Sans JP' }}>
      <div className="bg-[#2563EB] px-8 py-4 flex-shrink-0">
        {onChange ? (
          <input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-2xl font-bold text-white bg-transparent outline-none border-b border-white/0 hover:border-white/50 focus:border-white w-full transition-colors placeholder-white/60"
            placeholder="タイトルを入力..."
          />
        ) : (
          <h2 className="text-2xl font-bold text-white truncate">{slide.title}</h2>
        )}
      </div>
      <div className="h-1 bg-[#F97316] flex-shrink-0" />
      <div className="flex-1 px-8 py-6 overflow-hidden flex flex-col justify-center">
        {onChange ? (
          <EditableBodyItems
            body={slide.body}
            gapClass={gapClass}
            textClass={textClass}
            bulletColor="#2563EB"
            onBodyChange={(body) => onChange({ body })}
            fontSizeOverride={slide.bodyFontSize}
          />
        ) : (
          <ul className={gapClass}>
            {slide.body.map((item, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 text-gray-800 ${slide.bodyFontSize ? '' : textClass}`}
                style={slide.bodyFontSize ? { fontSize: `${slide.bodyFontSize}px` } : undefined}
              >
                <span
                  className={`${circleClass} rounded-full flex items-center justify-center text-white ${numClass} font-bold flex-shrink-0 mt-0.5`}
                  style={{ backgroundColor: i % 2 === 0 ? '#F97316' : '#2563EB' }}
                >
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#F97316]" />
      <div className="absolute bottom-3 right-5"><Logo /></div>
    </div>
  )
}

// ─── Image ────────────────────────────────────────────────────────────────────
function ImageSlide({ slide, onChange }: SlideProps) {
  return (
    <div className="w-full h-full bg-white flex flex-col relative" style={{ fontFamily: slide.fontFamily || 'Noto Sans JP' }}>
      <div className="bg-[#2563EB] px-8 py-3 flex-shrink-0">
        {onChange ? (
          <input
            value={slide.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-xl font-bold text-white bg-transparent outline-none border-b border-white/0 hover:border-white/50 focus:border-white w-full transition-colors placeholder-white/60"
            placeholder="タイトルを入力..."
          />
        ) : (
          <h2 className="text-xl font-bold text-white truncate">{slide.title}</h2>
        )}
      </div>
      <div className="h-1 bg-[#F97316] flex-shrink-0" />
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        {onChange ? (
          <ImageUploadArea
            imageUrl={slide.imageUrl}
            alt={slide.title}
            onImageChange={(url) => onChange({ imageUrl: url })}
          />
        ) : (
          slide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.imageUrl} alt={slide.title} className="max-w-full max-h-full object-contain rounded" />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">画像なし</p>
              </div>
            </div>
          )
        )}
      </div>
      {slide.body.length > 0 && (
        <div className="px-4 py-2 text-gray-500 text-xs text-center truncate">
          {onChange ? (
            <input
              value={slide.body[0] || ''}
              onChange={(e) => onChange({ body: [e.target.value] })}
              className="w-full text-center bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-400 text-gray-500 text-xs transition-colors"
              placeholder="キャプションを入力..."
            />
          ) : (
            slide.body.join(' ')
          )}
        </div>
      )}
      <div className="absolute bottom-3 right-5"><Logo /></div>
    </div>
  )
}
