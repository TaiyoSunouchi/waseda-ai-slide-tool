import { NextRequest, NextResponse } from 'next/server'
import { listPresentations, savePresentation } from '@/lib/storage'
import { Presentation } from '@/lib/types'

export async function GET() {
  try {
    const presentations = await listPresentations()
    return NextResponse.json(presentations)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: Presentation = await req.json()
    const saved = await savePresentation(body)
    return NextResponse.json(saved, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
