import { isDate, type Fuel, type Income } from './logic'

export interface Backup {
  app: 'my-bike-tracker'
  version: 1
  exportedAt: string
  fuels: Fuel[]
  incomes: Income[]
}

export const makeBackup = (fuels: Fuel[], incomes: Income[]): Backup => ({
  app: 'my-bike-tracker',
  version: 1,
  exportedAt: new Date().toISOString(),
  fuels,
  incomes,
})

export type BackupError = 'invalidFile' | 'invalidData' | 'orphanIncome'

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const optNum = (v: unknown) => v === undefined || v === null || (num(v) && v >= 0)
const optStr = (v: unknown) => v === undefined || v === null || typeof v === 'string'

/** Strictly validates and rebuilds clean records; nothing from the file is trusted blindly. */
export function parseBackup(text: string): { ok: true; data: Backup } | { ok: false; error: BackupError } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalidFile' }
  }
  const o = raw as Partial<Backup> | null
  if (!o || typeof o !== 'object' || o.app !== 'my-bike-tracker' || !Array.isArray(o.fuels) || !Array.isArray(o.incomes))
    return { ok: false, error: 'invalidFile' }

  const fuels: Fuel[] = []
  const ids = new Set<string>()
  const seqs = new Set<number>()
  for (const f of o.fuels as unknown as Record<string, unknown>[]) {
    if (
      !f || typeof f.id !== 'string' || !f.id || ids.has(f.id) ||
      !num(f.seq) || seqs.has(f.seq) || !isDate(f.date) ||
      !num(f.amount) || f.amount <= 0 ||
      !optNum(f.liters) || !optNum(f.odometer) || !optStr(f.notes)
    )
      return { ok: false, error: 'invalidData' }
    ids.add(f.id)
    seqs.add(f.seq)
    fuels.push({
      id: f.id, seq: f.seq, date: f.date, amount: f.amount,
      ...(f.liters != null ? { liters: f.liters as number } : {}),
      ...(f.odometer != null ? { odometer: f.odometer as number } : {}),
      ...(f.notes ? { notes: f.notes as string } : {}),
      createdAt: num(f.createdAt) ? f.createdAt : Date.now(),
    })
  }

  const incomes: Income[] = []
  const incIds = new Set<string>()
  for (const i of o.incomes as unknown as Record<string, unknown>[]) {
    if (
      !i || typeof i.id !== 'string' || !i.id || incIds.has(i.id) ||
      typeof i.fuelId !== 'string' || !isDate(i.date) ||
      !num(i.amount) || i.amount <= 0 ||
      (i.source !== 'ride' && i.source !== 'other') || !optStr(i.notes)
    )
      return { ok: false, error: 'invalidData' }
    if (!ids.has(i.fuelId)) return { ok: false, error: 'orphanIncome' }
    incIds.add(i.id)
    incomes.push({
      id: i.id, fuelId: i.fuelId, date: i.date, amount: i.amount, source: i.source,
      ...(i.notes ? { notes: i.notes as string } : {}),
      createdAt: num(i.createdAt) ? i.createdAt : Date.now(),
    })
  }
  return { ok: true, data: { app: 'my-bike-tracker', version: 1, exportedAt: String(o.exportedAt ?? ''), fuels, incomes } }
}
