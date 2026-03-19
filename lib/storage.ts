import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { Presentation } from './types'

const DATA_DIR = path.join(process.cwd(), 'data', 'presentations')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function filePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`)
}

export function savePresentation(p: Presentation): Presentation {
  ensureDir()
  const now = new Date().toISOString()
  const saved: Presentation = {
    ...p,
    id: p.id || randomUUID(),
    createdAt: p.createdAt || now,
    updatedAt: now,
  }
  fs.writeFileSync(filePath(saved.id!), JSON.stringify(saved, null, 2), 'utf-8')
  return saved
}

export function loadPresentation(id: string): Presentation | null {
  const fp = filePath(id)
  if (!fs.existsSync(fp)) return null
  return JSON.parse(fs.readFileSync(fp, 'utf-8')) as Presentation
}

export function listPresentations(): Presentation[] {
  ensureDir()
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
  const presentations = files.map((f) => {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8')) as Presentation
  })
  return presentations.sort((a, b) => {
    const aTime = a.updatedAt || a.createdAt || ''
    const bTime = b.updatedAt || b.createdAt || ''
    return bTime.localeCompare(aTime)
  })
}

export function deletePresentation(id: string): boolean {
  const fp = filePath(id)
  if (!fs.existsSync(fp)) return false
  fs.unlinkSync(fp)
  return true
}
