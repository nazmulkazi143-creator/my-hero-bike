import { round2, type Cycle, type Income } from './logic'

export interface Filters {
  from: string
  to: string
  /** 0 = all cycles */
  cycle: number
}

const inRange = (d: string, f: Filters) => (!f.from || d >= f.from) && (!f.to || d <= f.to)

export interface IncomeRow extends Income {
  cycleNumber: number
}

/** Income entries matching the filters (date range + optional cycle). */
export function filterIncomes(cycles: Cycle[], f: Filters): IncomeRow[] {
  const out: IncomeRow[] = []
  for (const c of cycles) {
    if (f.cycle && c.number !== f.cycle) continue
    for (const i of c.incomes) if (inRange(i.date, f)) out.push({ ...i, cycleNumber: c.number })
  }
  return out.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
}

/** Cycles matching the filters. Cycle totals are always whole-cycle (never split across a date range). */
export function filterCycles(cycles: Cycle[], f: Filters): Cycle[] {
  return cycles.filter((c) => (!f.cycle || c.number === f.cycle) && inRange(c.fuel.date, f))
}

export function dailyReport(cycles: Cycle[], f: Filters) {
  const map = new Map<string, { date: string; total: number; count: number; cycles: Set<number> }>()
  for (const i of filterIncomes(cycles, f)) {
    const g = map.get(i.date) ?? { date: i.date, total: 0, count: 0, cycles: new Set<number>() }
    g.total = round2(g.total + i.amount)
    g.count++
    g.cycles.add(i.cycleNumber)
    map.set(i.date, g)
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function monthlyReport(cycles: Cycle[], f: Filters) {
  const map = new Map<string, { month: string; income: number; fuel: number }>()
  const get = (m: string) => map.get(m) ?? { month: m, income: 0, fuel: 0 }
  for (const i of filterIncomes(cycles, f)) {
    const m = i.date.slice(0, 7)
    const g = get(m)
    g.income = round2(g.income + i.amount)
    map.set(m, g)
  }
  for (const c of filterCycles(cycles, f)) {
    const m = c.fuel.date.slice(0, 7)
    const g = get(m)
    g.fuel = round2(g.fuel + c.fuel.amount)
    map.set(m, g)
  }
  return [...map.values()]
    .map((g) => ({ ...g, after: round2(g.income - g.fuel) }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
}

export function sourceTotals(rows: IncomeRow[]) {
  return {
    ride: round2(rows.filter((r) => r.source === 'ride').reduce((s, r) => s + r.amount, 0)),
    other: round2(rows.filter((r) => r.source === 'other').reduce((s, r) => s + r.amount, 0)),
  }
}
