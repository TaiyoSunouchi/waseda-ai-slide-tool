import { NextRequest, NextResponse } from 'next/server'
import { exportToPptx } from '@/lib/pptxExport'
import { Presentation } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const presentation = await req.json() as Presentation

    const buffer = await exportToPptx(presentation)
    // Convert Node.js Buffer to Uint8Array for Web API compatibility
    const uint8Array = new Uint8Array(buffer)

    const filename = encodeURIComponent(`${presentation.title || 'presentation'}.pptx`)

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    const message = error instanceof Error ? error.message : 'PPTX出力に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
