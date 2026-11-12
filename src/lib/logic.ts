export type Source = 'ride' | 'other'

export interface Fuel {
  id: string
  /** Strictly increasing order in which fuel was purchased. One fuel purchase = one cycle. */
  seq: number
  date: string // YYYY-MM-DD
  amount: number
  liters?: number
  odometer?: number
  notes?: string
  createdAt: number
}

export interface Income {
  id: string
  /** The fuel cycle this income belongs to. Fixed forever once created. */
  fuelId: string
  date: string
  amount: number
  source: Source
  notes?: string
  createdAt: number
}

export interface Cycle {
  fuel: Fuel
  number: number
  status: 'active' | 'completed'
  incomes: Income[]
  totalIncome: number
  /** Income After Fuel Cost = total income - fuel purchase amount (NOT net profit). */
  remaining: number
  days: number
  incomeDays: number
  avgPerDay: number
  endDate?: string
  distance?: number
  recoveredPct: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const toUtc = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86400000)

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const isDate = (s: unknown): s is string => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const t = toUtc(s)
  return !isNaN(t) && new Date(t).toISOString().slice(0, 10) === s
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

export const compareIncome = (a: Income, b: Income) =>
  a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1

/**
 * Derive every fuel cycle from the stored fuel purchases and income entries.
 * Cycles are never stored, so every summary is always recalculated from the
 * source records. The latest fuel purchase is the active cycle; every earlier
 * one is completed. Income only ever counts toward the cycle named by its fuelId.
 */
export function buildCycles(fuels: Fuel[], incomes: Income[], today: string): { cycles: Cycle[]; orphans: Income[] } {
  const sorted = [...fuels].sort((a, b) => a.seq - b.seq)
  const ids = new Set(sorted.map((f) => f.id))
  const byFuel = new Map<string, Income[]>()
  const orphans: Income[] = []
  for (const i of incomes) {
    if (!ids.has(i.fuelId)) {
      orphans.push(i)
      continue
    }
    const list = byFuel.get(i.fuelId)
    if (list) list.push(i)
    else byFuel.set(i.fuelId, [i])
  }
  const cycles = sorted.map((fuel, idx): Cycle => {
    const next = sorted[idx + 1]
    const list = (byFuel.get(fuel.id) ?? []).sort(compareIncome)
    const totalIncome = round2(list.reduce((s, i) => s + i.amount, 0))
    const active = !next
    const days = active
      ? Math.max(1, daysBetween(fuel.date, today) + 1)
      : Math.max(1, daysBetween(fuel.date, next.date))
    const distance =
      next && fuel.odometer != null && next.odometer != null && next.odometer >= fuel.odometer
        ? next.odometer - fuel.odometer
        : undefined
    return {
      fuel,
      number: idx + 1,
      status: active ? 'active' : 'completed',
      incomes: list,
      totalIncome,
      remaining: round2(totalIncome - fuel.amount),
      days,
      incomeDays: new Set(list.map((i) => i.date)).size,
      avgPerDay: round2(totalIncome / days),
      endDate: next?.date,
      distance,
      recoveredPct: fuel.amount > 0 ? Math.min(100, (totalIncome / fuel.amount) * 100) : 0,
    }
  })
  return { cycles, orphans }
}

export function monthStats(fuels: Fuel[], incomes: Income[], month: string) {
  const income = round2(incomes.filter((i) => i.date.startsWith(month)).reduce((s, i) => s + i.amount, 0))
  const fuel = round2(fuels.filter((f) => f.date.startsWith(month)).reduce((s, f) => s + f.amount, 0))
  return { income, fuel, remaining: round2(income - fuel) }
}

export type FuelDateError = 'future' | 'beforePrev' | 'afterNext'

/** Keeps cycles in chronological order: a new fuel purchase can't be dated before the current one. */
export function validateFuelDate(fuels: Fuel[], date: string, today: string, editingId?: string): FuelDateError | null {
  if (date > today) return 'future'
  const sorted = [...fuels].sort((a, b) => a.seq - b.seq)
  if (!editingId) {
    const last = sorted[sorted.length - 1]
    return last && date < last.date ? 'beforePrev' : null
  }
  const i = sorted.findIndex((f) => f.id === editingId)
  if (i < 0) return null
  const prev = sorted[i - 1]
  const next = sorted[i + 1]
  if (prev && date < prev.date) return 'beforePrev'
  if (next && date > next.date) return 'afterNext'
  return null
}

export function groupByDate<T extends { date: string; amount: number }>(items: T[]) {
  const map = new Map<string, { date: string; total: number; items: T[] }>()
  for (const it of items) {
    const g = map.get(it.date)
    if (g) {
      g.items.push(it)
      g.total = round2(g.total + it.amount)
    } else map.set(it.date, { date: it.date, total: it.amount, items: [it] })
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}
