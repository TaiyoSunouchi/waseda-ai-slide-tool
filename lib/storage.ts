import { randomUUID } from 'crypto'
import { Presentation } from './types'

// Vercel KV (Redis) が利用可能かどうかで backend を切り替える
const USE_KV = !!process.env.KV_REST_API_URL

// ── Vercel KV backend ──────────────────────────────────────────────────────────

async function kvSave(p: Presentation): Promise<Presentation> {
  const { kv } = await import('@vercel/kv')
  const now = new Date().toISOString()
  const saved: Presentation = {
    ...p,
    id: p.id || randomUUID(),
    createdAt: p.createdAt || now,
    updatedAt: now,
  }
  await kv.set(`pres:${saved.id}`, JSON.stringify(saved))
  await kv.zadd('presentations', { score: Date.now(), member: saved.id! })
  return saved
}

async function kvList(): Promise<Presentation[]> {
  const { kv } = await import('@vercel/kv')
  const ids = (await kv.zrange('presentations', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return []
  const items = await Promise.all(ids.map((id) => kv.get<string>(`pres:${id}`)))
  return items.filter(Boolean).map((d) => JSON.parse(d as string) as Presentation)
}

async function kvLoad(id: string): Promise<Presentation | null> {
  const { kv } = await import('@vercel/kv')
  const data = await kv.get<string>(`pres:${id}`)
  return data ? (JSON.parse(data) as Presentation) : null
}

async function kvDelete(id: string): Promise<boolean> {
  const { kv } = await import('@vercel/kv')
  const data = await kv.get<string>(`pres:${id}`)
  if (!data) return false
  await kv.del(`pres:${id}`)
  await kv.zrem('presentations', id)
  return true
}

// ── ローカル fs backend ────────────────────────────────────────────────────────

async function fsDir() {
  const path = await import('path')
  const fs = await import('fs')
  const dir = path.join(process.cwd(), 'data', 'presentations')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function fsSave(p: Presentation): Promise<Presentation> {
  const path = await import('path')
  const fs = await import('fs')
  const dir = await fsDir()
  const now = new Date().toISOString()
  const saved: Presentation = {
    ...p,
    id: p.id || randomUUID(),
    createdAt: p.createdAt || now,
    updatedAt: now,
  }
  fs.writeFileSync(path.join(dir, `${saved.id}.json`), JSON.stringify(saved, null, 2), 'utf-8')
  return saved
}

async function fsList(): Promise<Presentation[]> {
  const path = await import('path')
  const fs = await import('fs')
  const dir = await fsDir()
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'))
  return files
    .map((f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as Presentation)
    .sort((a: Presentation, b: Presentation) =>
      (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
    )
}

async function fsLoad(id: string): Promise<Presentation | null> {
  const path = await import('path')
  const fs = await import('fs')
  const fp = path.join(process.cwd(), 'data', 'presentations', `${id}.json`)
  if (!fs.existsSync(fp)) return null
  return JSON.parse(fs.readFileSync(fp, 'utf-8')) as Presentation
}

async function fsDelete(id: string): Promise<boolean> {
  const path = await import('path')
  const fs = await import('fs')
  const fp = path.join(process.cwd(), 'data', 'presentations', `${id}.json`)
  if (!fs.existsSync(fp)) return false
  fs.unlinkSync(fp)
  return true
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function savePresentation(p: Presentation): Promise<Presentation> {
  return USE_KV ? kvSave(p) : fsSave(p)
}

export async function listPresentations(): Promise<Presentation[]> {
  return USE_KV ? kvList() : fsList()
}

export async function loadPresentation(id: string): Promise<Presentation | null> {
  return USE_KV ? kvLoad(id) : fsLoad(id)
}

export async function deletePresentation(id: string): Promise<boolean> {
  return USE_KV ? kvDelete(id) : fsDelete(id)
}
