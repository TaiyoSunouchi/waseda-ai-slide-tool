import fs from 'fs'
import path from 'path'
import PptxGenJS from 'pptxgenjs'
import { Presentation, Slide } from './types'

// LAYOUT_WIDE = 13.33" × 7.5" (16:9, 12192000 × 6858000 EMU)
// 1px (on 800×450 canvas) = 7.5/450 = 13.33/800 = 0.016667 in
const PX_TO_IN = 7.5 / 450

const W = 13.33  // スライド幅 (inches)
const H = 7.5    // スライド高さ (inches)
const MX = 0.6   // 左右マージン
const CW = W - MX * 2  // コンテンツ幅 = 12.13"
const TITLE_BAR_H = 1.2  // タイトルバー高さ
const ACCENT_H = 0.07    // アクセントライン高さ
const STRIPE = 0.2       // サイド縦帯幅
const LOGO_W = 1.9       // ロゴ幅
const LOGO_H = 0.24      // ロゴ高さ
const LOGO_X = W - 0.4 - LOGO_W  // = 11.03
const LOGO_Y = H - 0.3 - LOGO_H  // = 6.96

/** HTMLタグ・エンティティを除去してプレーンテキストを返す（サーバーサイド用） */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function addFloatingImages(s: PptxGenJS.Slide, slide: Slide) {
  if (!slide.floatingImages || slide.floatingImages.length === 0) return
  const sorted = [...slide.floatingImages].sort((a, b) => a.zIndex - b.zIndex)
  for (const img of sorted) {
    try {
      s.addImage({
        data: img.dataUrl,
        x: img.x * PX_TO_IN,
        y: img.y * PX_TO_IN,
        w: img.width * PX_TO_IN,
        h: img.height * PX_TO_IN,
      })
    } catch {
      // 画像追加失敗時はスキップ
    }
  }
}

/** public/logo.png を base64 data URL で返す（キャッシュ） */
let _logoData: string | null = null
function getLogoData(): string | null {
  if (_logoData) return _logoData
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const buf = fs.readFileSync(logoPath)
    _logoData = 'data:image/png;base64,' + buf.toString('base64')
    return _logoData
  } catch {
    return null
  }
}

/** スライドにロゴを追加（右下固定） */
function addLogo(s: PptxGenJS.Slide) {
  const logo = getLogoData()
  if (logo) {
    s.addImage({ data: logo, x: LOGO_X, y: LOGO_Y, w: LOGO_W, h: LOGO_H })
  }
}

// テーマカラー
const THEME = {
  bg: 'FFFFFF',
  bgLight: 'F9FAFB',
  orange: 'F97316',
  blue: '2563EB',
  white: 'FFFFFF',
  textDark: '111827',
  textMedium: '374151',
  textLight: '6B7280',
}

// ─── スタイルスケーリング ─────────────────────────────────────────────────────
function getContentPptxStyle(count: number): { fontSize: number; paraSpaceAfter: number } {
  if (count <= 2) return { fontSize: 21, paraSpaceAfter: 18 }
  if (count <= 3) return { fontSize: 19, paraSpaceAfter: 14 }
  if (count <= 5) return { fontSize: 18, paraSpaceAfter: 9  }
  if (count <= 7) return { fontSize: 17, paraSpaceAfter: 6  }
  return               { fontSize: 15, paraSpaceAfter: 4  }
}

function getTwoColPptxStyle(maxColCount: number): { fontSize: number; paraSpaceAfter: number } {
  if (maxColCount <= 2) return { fontSize: 17, paraSpaceAfter: 14 }
  if (maxColCount <= 3) return { fontSize: 16, paraSpaceAfter: 9  }
  if (maxColCount <= 5) return { fontSize: 15, paraSpaceAfter: 6  }
  return                    { fontSize: 13, paraSpaceAfter: 3  }
}

/** Summary スライドの縦レイアウトをアイテム数から動的計算 */
function getSummaryPptxLayout(count: number): {
  startY: number; step: number; circleSize: number; fontSize: number
} {
  // LAYOUT_WIDE (H=7.5") に合わせたコンテンツ領域
  const contentTop = 1.4
  const contentBottom = 7.1  // 底部のフッターラインと logo の上
  const available = contentBottom - contentTop

  const circleSize = count <= 2 ? 0.50 : count <= 4 ? 0.42 : count <= 6 ? 0.36 : 0.30
  const fontSize   = count <= 2 ? 21   : count <= 3 ? 19   : count <= 5 ? 17   : count <= 7 ? 16 : 14

  const rawStep = available / count
  const step = Math.min(rawStep, 1.0)

  const totalH = (count - 1) * step + circleSize
  const startY = contentTop + (available - totalH) / 2

  return { startY, step, circleSize, fontSize }
}

// ─── Title ────────────────────────────────────────────────────────────────────
function addTitleSlide(pptx: PptxGenJS, slide: Slide) {
  const s = pptx.addSlide()
  s.background = { color: THEME.bg }

  // 左オレンジ縦帯 (12px = STRIPE=0.2")
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: STRIPE, h: '100%',
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  // 右青縦帯 (W - STRIPE = 13.13")
  s.addShape(pptx.ShapeType.rect, {
    x: W - STRIPE, y: 0, w: STRIPE, h: '100%',
    fill: { color: THEME.blue },
    line: { type: 'none' },
  })

  // 底の青ライン（スライド下端ぴったり）
  s.addShape(pptx.ShapeType.rect, {
    x: STRIPE, y: H - ACCENT_H, w: W - STRIPE * 2, h: ACCENT_H,
    fill: { color: THEME.blue },
    line: { type: 'none' },
  })

  // タイトル（上寄り中央）
  s.addText(stripHtml(slide.title), {
    x: MX, y: 2.2, w: CW, h: 2.0,
    fontSize: 40,
    bold: true,
    color: THEME.textDark,
    fontFace: slide.fontFamily || 'Noto Sans JP',
    align: 'center',
    valign: 'middle',
  })

  // サブタイトル（タイトル直下）
  if (slide.body.length > 0) {
    s.addText(slide.body.map(stripHtml).join('\n'), {
      x: MX, y: 4.4, w: CW, h: 1.6,
      fontSize: slide.bodyFontSize || 20,
      color: THEME.textLight,
      fontFace: slide.fontFamily || 'Noto Sans JP',
      align: 'center',
      valign: 'middle',
    })
  }

  addFloatingImages(s, slide)
  addLogo(s)
}

// ─── Section ──────────────────────────────────────────────────────────────────
function addSectionSlide(pptx: PptxGenJS, slide: Slide) {
  const s = pptx.addSlide()
  s.background = { color: THEME.blue }

  // 左オレンジ縦帯
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: STRIPE, h: '100%',
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  s.addText(slide.title, {
    x: MX, y: 2.5, w: CW, h: 2.5,
    fontSize: 36,
    bold: true,
    color: THEME.white,
    fontFace: slide.fontFamily || 'Noto Sans JP',
    align: 'center',
    valign: 'middle',
  })

  addFloatingImages(s, slide)
  addLogo(s)
}

// ─── Content ──────────────────────────────────────────────────────────────────
function addContentSlide(pptx: PptxGenJS, slide: Slide) {
  const s = pptx.addSlide()
  s.background = { color: THEME.bg }

  // オレンジタイトルバー
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: TITLE_BAR_H,
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  // 青アクセントライン（タイトルバー直下）
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: TITLE_BAR_H, w: '100%', h: ACCENT_H,
    fill: { color: THEME.blue },
    line: { type: 'none' },
  })

  // タイトルテキスト
  s.addText(slide.title, {
    x: MX, y: 0.1, w: CW, h: TITLE_BAR_H - 0.1,
    fontSize: 24,
    bold: true,
    color: THEME.white,
    fontFace: slide.fontFamily || 'Noto Sans JP',
    valign: 'middle',
  })

  // コンテンツ（タイトルバー+アクセントライン直下からロゴ上まで）
  const bodyTop = TITLE_BAR_H + ACCENT_H + 0.1  // = 1.37"
  const bodyH = H - bodyTop - 0.6               // = 5.53"
  const { fontSize: bFontSize, paraSpaceAfter: bSpacing } = getContentPptxStyle(slide.body.length)
  const bulletPoints = slide.body.map((item) => ({
    text: stripHtml(item),
    options: {
      bullet: { type: 'bullet' as const },
      fontSize: slide.bodyFontSize || bFontSize,
      color: THEME.textDark,
      fontFace: slide.fontFamily || 'Noto Sans JP',
      paraSpaceAfter: bSpacing,
    },
  }))

  if (bulletPoints.length > 0) {
    s.addText(bulletPoints, {
      x: MX, y: bodyTop, w: CW, h: bodyH,
      valign: 'middle',
    })
  }

  // フッターライン（スライド下端）
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: H - ACCENT_H, w: '100%', h: ACCENT_H,
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  addFloatingImages(s, slide)
  addLogo(s)
}

// ─── Two-Column ───────────────────────────────────────────────────────────────
function addTwoColumnSlide(pptx: PptxGenJS, slide: Slide) {
  const s = pptx.addSlide()
  s.background = { color: THEME.bg }

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: TITLE_BAR_H,
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: TITLE_BAR_H, w: '100%', h: ACCENT_H,
    fill: { color: THEME.blue },
    line: { type: 'none' },
  })

  s.addText(slide.title, {
    x: MX, y: 0.1, w: CW, h: TITLE_BAR_H - 0.1,
    fontSize: 24,
    bold: true,
    color: THEME.white,
    fontFace: slide.fontFamily || 'Noto Sans JP',
    valign: 'middle',
  })

  const half = Math.ceil(slide.body.length / 2)
  const leftItems = slide.body.slice(0, half)
  const rightItems = slide.body.slice(half)

  const { fontSize: cFontSize, paraSpaceAfter: cSpacing } =
    getTwoColPptxStyle(Math.max(leftItems.length, rightItems.length))

  const colTop = TITLE_BAR_H + ACCENT_H + 0.1
  const colH = H - colTop - 0.5
  const colW = W / 2 - MX - 0.1  // ≈ 5.87"
  const divX = W / 2              // = 6.665"

  const leftBullets = leftItems.map((item) => ({
    text: stripHtml(item),
    options: {
      bullet: { type: 'bullet' as const },
      fontSize: slide.bodyFontSize || cFontSize,
      color: THEME.textDark,
      fontFace: slide.fontFamily || 'Noto Sans JP',
      paraSpaceAfter: cSpacing,
    },
  }))

  const rightBullets = rightItems.map((item) => ({
    text: stripHtml(item),
    options: {
      bullet: { type: 'bullet' as const },
      fontSize: slide.bodyFontSize || cFontSize,
      color: THEME.textDark,
      fontFace: slide.fontFamily || 'Noto Sans JP',
      paraSpaceAfter: cSpacing,
    },
  }))

  if (leftBullets.length > 0) {
    s.addText(leftBullets, { x: MX, y: colTop, w: colW, h: colH, valign: 'middle' })
  }

  // 青い中央区切り線
  s.addShape(pptx.ShapeType.line, {
    x: divX, y: colTop, w: 0, h: colH - 0.2,
    line: { color: THEME.blue, width: 1 },
  })

  if (rightBullets.length > 0) {
    s.addText(rightBullets, { x: divX + 0.15, y: colTop, w: colW, h: colH, valign: 'middle' })
  }

  addFloatingImages(s, slide)
  addLogo(s)
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function addSummarySlide(pptx: PptxGenJS, slide: Slide) {
  const s = pptx.addSlide()
  s.background = { color: THEME.bgLight }

  // 青タイトルバー
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: TITLE_BAR_H,
    fill: { color: THEME.blue },
    line: { type: 'none' },
  })

  // オレンジアクセントライン
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: TITLE_BAR_H, w: '100%', h: ACCENT_H,
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  s.addText(slide.title, {
    x: MX, y: 0.1, w: CW, h: TITLE_BAR_H - 0.1,
    fontSize: 24,
    bold: true,
    color: THEME.white,
    fontFace: slide.fontFamily || 'Noto Sans JP',
    valign: 'middle',
  })

  // 番号付きリスト
  const { startY, step, circleSize, fontSize: sFontSize } = getSummaryPptxLayout(slide.body.length)
  const numFontSize = Math.max(9, Math.round(sFontSize * 0.6))

  slide.body.forEach((item, i) => {
    const circleColor = i % 2 === 0 ? THEME.orange : THEME.blue
    const yPos = startY + i * step
    const circleX = 0.5

    s.addShape(pptx.ShapeType.ellipse, {
      x: circleX, y: yPos, w: circleSize, h: circleSize,
      fill: { color: circleColor },
      line: { type: 'none' },
    })

    s.addText(String(i + 1), {
      x: circleX, y: yPos, w: circleSize, h: circleSize,
      fontSize: numFontSize,
      bold: true,
      color: THEME.white,
      fontFace: 'Noto Sans JP',
      align: 'center',
      valign: 'middle',
    })

    s.addText(stripHtml(item), {
      x: circleX + circleSize + 0.15, y: yPos,
      w: W - circleX - circleSize - 0.65, h: circleSize,
      fontSize: slide.bodyFontSize || sFontSize,
      color: THEME.textDark,
      fontFace: slide.fontFamily || 'Noto Sans JP',
      valign: 'middle',
    })
  })

  // フッターライン（スライド下端）
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: H - ACCENT_H, w: '100%', h: ACCENT_H,
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  addFloatingImages(s, slide)
  addLogo(s)
}

// ─── Image ────────────────────────────────────────────────────────────────────
function addImageSlide(pptx: PptxGenJS, slide: Slide) {
  const s = pptx.addSlide()
  s.background = { color: THEME.bg }

  // 青タイトルバー
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 1.0,
    fill: { color: THEME.blue },
    line: { type: 'none' },
  })

  // オレンジアクセントライン
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 1.0, w: '100%', h: ACCENT_H,
    fill: { color: THEME.orange },
    line: { type: 'none' },
  })

  s.addText(slide.title, {
    x: MX, y: 0.1, w: CW, h: 0.8,
    fontSize: 22,
    bold: true,
    color: THEME.white,
    fontFace: slide.fontFamily || 'Noto Sans JP',
    valign: 'middle',
  })

  if (slide.imageUrl) {
    try {
      // 画像はスライド中央に横幅いっぱい近くで配置
      const imgW = W - 2.0
      const imgX = (W - imgW) / 2
      s.addImage({ data: slide.imageUrl, x: imgX, y: 1.15, w: imgW, h: 4.8 })
    } catch {
      // 画像追加失敗時はスキップ
    }
  }

  if (slide.body.length > 0) {
    s.addText(slide.body.map(stripHtml).join(' '), {
      x: MX, y: 6.1, w: CW, h: 0.8,
      fontSize: slide.bodyFontSize || 14,
      color: THEME.textLight,
      fontFace: slide.fontFamily || 'Noto Sans JP',
      align: 'center',
    })
  }

  addFloatingImages(s, slide)
  addLogo(s)
}

export async function exportToPptx(presentation: Presentation): Promise<Buffer> {
  const pptx = new PptxGenJS()

  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = presentation.title
  pptx.author = '早稲田AI研究会'

  for (const slide of presentation.slides) {
    switch (slide.layout) {
      case 'title':
        addTitleSlide(pptx, slide)
        break
      case 'section':
        addSectionSlide(pptx, slide)
        break
      case 'two-column':
        addTwoColumnSlide(pptx, slide)
        break
      case 'summary':
        addSummarySlide(pptx, slide)
        break
      case 'image':
        addImageSlide(pptx, slide)
        break
      case 'content':
      default:
        addContentSlide(pptx, slide)
        break
    }
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' })
  return Buffer.from(buffer as ArrayBuffer)
}
