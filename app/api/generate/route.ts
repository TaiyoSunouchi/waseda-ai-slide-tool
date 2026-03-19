import { NextRequest, NextResponse } from 'next/server'
import { generatePresentation } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, imageUrls = [] } = body as { text: string; imageUrls: string[] }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'テキストを入力してください' }, { status: 400 })
    }

    const presentation = await generatePresentation(text, imageUrls)

    return NextResponse.json(presentation)
  } catch (error) {
    console.error('Generate error:', error)
    const message = error instanceof Error ? error.message : 'スライド生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
