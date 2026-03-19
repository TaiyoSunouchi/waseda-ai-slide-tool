import { randomUUID } from 'crypto'
import { Presentation } from './types'

// ── ローカル fs backend ────────────────────────────────────────────────────────
// Vercelサーバーレス環境ではfsへの書き込みが不可のためtry-catchで失敗を吸収する。
// スライド生成・編集機能はsessionStorageベースで動作するため影響なし。

async function getDataDir(): Promise<string> {
  const path = await import('path')
  const fs = await import('fs')
  const dir = path.join(process.cwd(), 'data', 'presentations')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function savePresentation(p: Presentation): Promise<Presentation> {
  const now = new Date().toISOString()
  const saved: Presentation = {
    ...p,
    id: p.id || randomUUID(),
    createdAt: p.createdAt || now,
    updatedAt: now,
  }
  try {
    const path = await import('path')
    const fs = await import('fs')
    const dir = await getDataDir()
    fs.writeFileSync(path.join(dir, `${saved.id}.json`), JSON.stringify(saved, null, 2), 'utf-8')
  } catch {
    // Vercelなどfsが書き込み不可の環境では無視（スライド生成は継続動作）
  }
  return saved
}

export async function listPresentations(): Promise<Presentation[]> {
  try {
    const path = await import('path')
    const fs = await import('fs')
    const dir = await getDataDir()
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'))
    return files
      .map((f: string) =>
        JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as Presentation
      )
      .sort((a: Presentation, b: Presentation) =>
        (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
      )
  } catch {
    return []
  }
}

export async function loadPresentation(id: string): Promise<Presentation | null> {
  try {
    const path = await import('path')
    const fs = await import('fs')
    const fp = path.join(process.cwd(), 'data', 'presentations', `${id}.json`)
    if (!fs.existsSync(fp)) return null
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as Presentation
  } catch {
    return null
  }
}

export async function deletePresentation(id: string): Promise<boolean> {
  try {
    const path = await import('path')
    const fs = await import('fs')
    const fp = path.join(process.cwd(), 'data', 'presentations', `${id}.json`)
    if (!fs.existsSync(fp)) return false
    fs.unlinkSync(fp)
    return true
  } catch {
    return false
  }
}
