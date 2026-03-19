// Client-side only — contenteditable selection helpers

let _savedRange: Range | null = null
let _trackingStarted = false

/**
 * selectionchange イベントで contenteditable 内の選択を常時追跡する。
 * EditableBodyItems の useEffect で一度だけ呼び出す。
 */
export function initSelectionTracking() {
  if (_trackingStarted || typeof document === 'undefined') return
  _trackingStarted = true
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    const node = range.commonAncestorContainer
    const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null
    if (el?.closest('[contenteditable="true"]')) {
      _savedRange = range.cloneRange()
    }
  })
}

/**
 * 保存済みの Range を持つ contenteditable にフォーカスを戻し選択を復元する。
 * 非 collapsed な選択が復元できた場合 true を返す。
 */
export function restoreRange(): boolean {
  if (!_savedRange) return false
  try {
    const node = _savedRange.commonAncestorContainer
    const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement | null
    const editable = el?.closest('[contenteditable="true"]') as HTMLElement | null
    if (!editable) return false
    editable.focus()
    const sel = window.getSelection()
    if (!sel) return false
    sel.removeAllRanges()
    sel.addRange(_savedRange.cloneRange())
    return !sel.isCollapsed
  } catch {
    return false
  }
}

/**
 * フォーカス中の contenteditable に input イベントを発火して
 * React の onInput ハンドラ（innerHTML → state 同期）を起動する。
 */
export function dispatchInputEvent() {
  const el = document.activeElement as HTMLElement | null
  if (el?.contentEditable === 'true') {
    el.dispatchEvent(new InputEvent('input', { bubbles: true }))
  }
}

// ─── 共通ラップ処理 ───────────────────────────────────────────────────────────
function wrapWithSpan(style: Partial<CSSStyleDeclaration>): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false
  const range = sel.getRangeAt(0)
  const span = document.createElement('span')
  Object.assign(span.style, style)
  try {
    // 選択範囲が単一ノード内に収まる場合
    range.surroundContents(span)
  } catch {
    // 複数ノードをまたぐ場合: extractContents で取り出してラップ
    span.appendChild(range.extractContents())
    range.insertNode(span)
  }
  // 適用後も選択を維持
  const newRange = document.createRange()
  newRange.selectNodeContents(span)
  sel.removeAllRanges()
  sel.addRange(newRange)
  return true
}

export function applyFontFamily(fontFamily: string): boolean {
  return wrapWithSpan({ fontFamily })
}

export function applyFontSizePx(sizePx: number): boolean {
  return wrapWithSpan({ fontSize: `${sizePx}px` })
}

export function applyColor(color: string): boolean {
  return wrapWithSpan({ color })
}
