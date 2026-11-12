import { describe, it, expect } from 'vitest'
import { buildCycles, monthStats, validateFuelDate, daysBetween, type Fuel, type Income } from './logic'
import { createMemoryDb } from './db'
import { makeBackup, parseBackup } from './backup'
import { dailyReport, monthlyReport, filterIncomes } from './reports'
import { parseNumber } from './format'

const fuel = (id: string, seq: number, date: string, amount: number, extra: Partial<Fuel> = {}): Fuel => ({
  id, seq, date, amount, createdAt: seq, ...extra,
})
const inc = (id: string, fuelId: string, date: string, amount: number, n = 0): Income => ({
  id, fuelId, date, amount, source: 'ride', createdAt: n,
})

describe('fuel cycles', () => {
  it('matches the worked example: 500 fuel, 700+400+600+300 income => 1500 remaining', () => {
    const fuels = [fuel('f1', 1, '2026-11-01', 500)]
    const incomes = [
      inc('a', 'f1', '2026-11-01', 700), inc('b', 'f1', '2026-11-02', 400),
      inc('c', 'f1', '2026-11-03', 600), inc('d', 'f1', '2026-11-04', 300),
    ]
    const { cycles } = buildCycles(fuels, incomes, '2026-11-04')
    expect(cycles).toHaveLength(1)
    expect(cycles[0].totalIncome).toBe(2000)
    expect(cycles[0].remaining).toBe(1500)
    expect(cycles[0].days).toBe(4)
    expect(cycles[0].status).toBe('active')
  })

  it('a new fuel purchase closes the previous cycle and starts at zero; cycles never mix', () => {
    const fuels = [fuel('f1', 1, '2026-11-01', 500), fuel('f2', 2, '2026-11-05', 600)]
    const incomes = [inc('a', 'f1', '2026-11-02', 2000), inc('b', 'f2', '2026-11-06', 250)]
    const { cycles } = buildCycles(fuels, incomes, '2026-11-06')
    expect(cycles[0].status).toBe('completed')
    expect(cycles[0].totalIncome).toBe(2000)
    expect(cycles[0].remaining).toBe(1500)
    expect(cycles[0].days).toBe(4) // Nov 1..4
    expect(cycles[1].status).toBe('active')
    expect(cycles[1].totalIncome).toBe(250)
    expect(cycles[1].remaining).toBe(-350)
  })

  it('allows multiple income entries on the same date', () => {
    const fuels = [fuel('f1', 1, '2026-11-01', 100)]
    const incomes = [inc('a', 'f1', '2026-11-01', 50, 1), inc('b', 'f1', '2026-11-01', 70, 2)]
    const { cycles } = buildCycles(fuels, incomes, '2026-11-01')
    expect(cycles[0].totalIncome).toBe(120)
    expect(cycles[0].incomeDays).toBe(1)
  })

  it('editing or deleting records recalculates; deleting the latest fuel reopens the previous cycle', () => {
    let fuels = [fuel('f1', 1, '2026-11-01', 500), fuel('f2', 2, '2026-11-05', 600)]
    let incomes = [inc('a', 'f1', '2026-11-02', 2000), inc('b', 'f2', '2026-11-06', 250)]
    incomes = incomes.map((i) => (i.id === 'a' ? { ...i, amount: 1000 } : i))
    expect(buildCycles(fuels, incomes, '2026-11-06').cycles[0].remaining).toBe(500)
    incomes = incomes.filter((i) => i.id !== 'b')
    fuels = fuels.filter((f) => f.id !== 'f2')
    const { cycles } = buildCycles(fuels, incomes, '2026-11-06')
    expect(cycles).toHaveLength(1)
    expect(cycles[0].status).toBe('active')
  })

  it('reports orphaned income instead of counting it anywhere', () => {
    const { cycles, orphans } = buildCycles([fuel('f1', 1, '2026-11-01', 100)], [inc('x', 'gone', '2026-11-01', 999)], '2026-11-01')
    expect(orphans).toHaveLength(1)
    expect(cycles[0].totalIncome).toBe(0)
  })

  it('computes distance from odometers of consecutive purchases', () => {
    const fuels = [fuel('f1', 1, '2026-11-01', 500, { odometer: 1000 }), fuel('f2', 2, '2026-11-05', 500, { odometer: 1180 })]
    expect(buildCycles(fuels, [], '2026-11-05').cycles[0].distance).toBe(180)
  })

  it('same-day refuel gives the closed cycle at least 1 day', () => {
    const fuels = [fuel('f1', 1, '2026-11-01', 500), fuel('f2', 2, '2026-11-01', 500)]
    expect(buildCycles(fuels, [], '2026-11-01').cycles[0].days).toBe(1)
  })

  it('month stats sum by calendar month', () => {
    const fuels = [fuel('f1', 1, '2026-10-30', 500), fuel('f2', 2, '2026-11-05', 600)]
    const incomes = [inc('a', 'f1', '2026-10-31', 900), inc('b', 'f1', '2026-11-02', 800), inc('c', 'f2', '2026-11-06', 250)]
    expect(monthStats(fuels, incomes, '2026-11')).toEqual({ income: 1050, fuel: 600, remaining: 450 })
  })
})

describe('validation', () => {
  const fuels = [fuel('f1', 1, '2026-11-01', 1), fuel('f2', 2, '2026-11-05', 1), fuel('f3', 3, '2026-11-09', 1)]
  it('rejects future and out-of-order fuel dates', () => {
    expect(validateFuelDate(fuels, '2026-11-12', '2026-11-11')).toBe('future')
    expect(validateFuelDate(fuels, '2026-11-08', '2026-11-11')).toBe('beforePrev')
    expect(validateFuelDate(fuels, '2026-11-10', '2026-11-11')).toBeNull()
    expect(validateFuelDate(fuels, '2026-11-03', '2026-11-11', 'f2')).toBeNull()
    expect(validateFuelDate(fuels, '2026-10-30', '2026-11-11', 'f2')).toBe('beforePrev')
    expect(validateFuelDate(fuels, '2026-11-10', '2026-11-11', 'f2')).toBe('afterNext')
  })
  it('parses Bangla digits', () => {
    expect(parseNumber('১,২৫০.৫০')).toBe(1250.5)
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('')).toBeNull()
  })
  it('daysBetween', () => expect(daysBetween('2026-11-01', '2026-11-04')).toBe(3))
})

describe('db + backup', () => {
  it('batch deletes a fuel and its income together, and restore replaces everything', async () => {
    const db = createMemoryDb()
    const f1 = fuel('f1', 1, '2026-11-01', 500)
    const f2 = fuel('f2', 2, '2026-11-05', 600)
    await db.batch([
      { t: 'put', s: 'fuels', v: f1 }, { t: 'put', s: 'fuels', v: f2 },
      { t: 'put', s: 'incomes', v: inc('a', 'f1', '2026-11-02', 10) },
      { t: 'put', s: 'incomes', v: inc('b', 'f2', '2026-11-06', 20) },
    ])
    await db.batch([{ t: 'del', s: 'incomes', id: 'b' }, { t: 'del', s: 'fuels', id: 'f2' }])
    expect(await db.getAll('fuels')).toHaveLength(1)
    expect(await db.getAll('incomes')).toHaveLength(1)

    const backup = makeBackup(await db.getAll<Fuel>('fuels'), await db.getAll<Income>('incomes'))
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.ok).toBe(true)
    await db.batch([{ t: 'clear', s: 'fuels' }, { t: 'clear', s: 'incomes' }])
    expect(await db.getAll('fuels')).toHaveLength(0)
  })

  it('rejects bad backups', () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'other' })).ok).toBe(false)
    const bad = { app: 'my-bike-tracker', version: 1, fuels: [fuel('f1', 1, '2026-11-01', 5)], incomes: [inc('a', 'zzz', '2026-11-01', 5)] }
    const r = parseBackup(JSON.stringify(bad))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('orphanIncome')
    const neg = { app: 'my-bike-tracker', version: 1, fuels: [fuel('f1', 1, '2026-11-01', -5)], incomes: [] }
    expect(parseBackup(JSON.stringify(neg)).ok).toBe(false)
  })
})

describe('reports', () => {
  const fuels = [fuel('f1', 1, '2026-10-30', 500), fuel('f2', 2, '2026-11-05', 600)]
  const incomes = [inc('a', 'f1', '2026-10-31', 900), inc('b', 'f1', '2026-11-02', 800), inc('c', 'f2', '2026-11-06', 250)]
  const { cycles } = buildCycles(fuels, incomes, '2026-11-06')
  it('filters by cycle and date', () => {
    expect(filterIncomes(cycles, { from: '', to: '', cycle: 1 })).toHaveLength(2)
    expect(filterIncomes(cycles, { from: '2026-11-01', to: '', cycle: 0 })).toHaveLength(2)
    expect(dailyReport(cycles, { from: '', to: '', cycle: 0 })).toHaveLength(3)
  })
  it('monthly report', () => {
    const m = monthlyReport(cycles, { from: '', to: '', cycle: 0 })
    expect(m.find((x) => x.month === '2026-11')).toMatchObject({ income: 1050, fuel: 600, after: 450 })
    expect(m.find((x) => x.month === '2026-10')).toMatchObject({ income: 900, fuel: 500, after: 400 })
  })
})
