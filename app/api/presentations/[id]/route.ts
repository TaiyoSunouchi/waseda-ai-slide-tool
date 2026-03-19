import { NextRequest, NextResponse } from 'next/server'
import { loadPresentation, savePresentation, deletePresentation } from '@/lib/storage'
import { Presentation } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const presentation = loadPresentation(id)
    if (!presentation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(presentation)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body: Presentation = await req.json()
    const existing = loadPresentation(id)
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const updated = savePresentation({ ...body, id, createdAt: existing.createdAt })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ok = deletePresentation(id)
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
