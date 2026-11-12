import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { openDb, type Db, type Op } from './lib/db'
import { buildCycles, todayStr, uid, type Cycle, type Fuel, type Income, type Source } from './lib/logic'
import { makeBackup, type Backup } from './lib/backup'

export interface FuelInput {
  date: string
  amount: number
  liters?: number
  odometer?: number
  notes?: string
}
export interface IncomeInput {
  date: string
  amount: number
  source: Source
  notes?: string
}

interface StoreApi {
  ready: boolean
  persistent: boolean
  fuels: Fuel[]
  incomes: Income[]
  cycles: Cycle[]
  orphans: Income[]
  active?: Cycle
  today: string
  addFuel: (v: FuelInput) => Promise<Fuel>
  updateFuel: (id: string, v: FuelInput) => Promise<void>
  deleteFuel: (id: string) => Promise<void>
  addIncome: (v: IncomeInput) => Promise<Income>
  updateIncome: (id: string, v: IncomeInput) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
  restore: (b: Backup) => Promise<void>
  eraseAll: () => Promise<void>
  backup: () => Backup
}

const Ctx = createContext<StoreApi>(null as unknown as StoreApi)
export const useStore = () => useContext(Ctx)

const clean = (v: FuelInput) => ({
  date: v.date,
  amount: v.amount,
  ...(v.liters ? { liters: v.liters } : {}),
  ...(v.odometer != null ? { odometer: v.odometer } : {}),
  ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
})

export function StoreProvider({ children }: { children: ReactNode }) {
  const dbRef = useRef<Db | null>(null)
  const [ready, setReady] = useState(false)
  const [persistent, setPersistent] = useState(true)
  const [fuels, setFuels] = useState<Fuel[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [today, setToday] = useState(todayStr())

  const reload = useCallback(async () => {
    const db = dbRef.current!
    const [f, i] = await Promise.all([db.getAll<Fuel>('fuels'), db.getAll<Income>('incomes')])
    setFuels(f)
    setIncomes(i)
  }, [])

  useEffect(() => {
    let alive = true
    openDb().then(async (db) => {
      dbRef.current = db
      setPersistent(db.persistent)
      await reload()
      if (alive) setReady(true)
    })
    return () => {
      alive = false
    }
  }, [reload])

  // keep "today" correct when the app stays open across midnight
  useEffect(() => {
    const tick = () => setToday(todayStr())
    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const { cycles, orphans } = useMemo(() => buildCycles(fuels, incomes, today), [fuels, incomes, today])

  const write = useCallback(
    async (ops: Op[]) => {
      await dbRef.current!.batch(ops)
      await reload()
    },
    [reload],
  )

  const api = useMemo<StoreApi>(
    () => ({
      ready,
      persistent,
      fuels,
      incomes,
      cycles,
      orphans,
      active: cycles[cycles.length - 1],
      today,
      async addFuel(v) {
        const all = await dbRef.current!.getAll<Fuel>('fuels')
        const seq = Math.max(0, ...all.map((f) => f.seq)) + 1
        const fuel: Fuel = { id: uid(), seq, createdAt: Date.now(), ...clean(v) }
        await write([{ t: 'put', s: 'fuels', v: fuel }])
        return fuel
      },
      async updateFuel(id, v) {
        const all = await dbRef.current!.getAll<Fuel>('fuels')
        const old = all.find((f) => f.id === id)
        if (!old) throw new Error('NOT_FOUND')
        const next: Fuel = { id: old.id, seq: old.seq, createdAt: old.createdAt, ...clean(v) }
        await write([{ t: 'put', s: 'fuels', v: next }])
      },
      async deleteFuel(id) {
        const inc = (await dbRef.current!.getAll<Income>('incomes')).filter((i) => i.fuelId === id)
        await write([...inc.map((i): Op => ({ t: 'del', s: 'incomes', id: i.id })), { t: 'del', s: 'fuels', id }])
      },
      async addIncome(v) {
        // Always attaches to the active cycle as it is stored right now.
        const all = await dbRef.current!.getAll<Fuel>('fuels')
        const act = all.sort((a, b) => a.seq - b.seq)[all.length - 1]
        if (!act) throw new Error('NO_CYCLE')
        const income: Income = {
          id: uid(), fuelId: act.id, createdAt: Date.now(),
          date: v.date, amount: v.amount, source: v.source,
          ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
        }
        await write([{ t: 'put', s: 'incomes', v: income }])
        return income
      },
      async updateIncome(id, v) {
        const old = (await dbRef.current!.getAll<Income>('incomes')).find((i) => i.id === id)
        if (!old) throw new Error('NOT_FOUND')
        // fuelId is deliberately copied from the old record: income never changes cycle.
        const next: Income = {
          id: old.id, fuelId: old.fuelId, createdAt: old.createdAt,
          date: v.date, amount: v.amount, source: v.source,
          ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
        }
        await write([{ t: 'put', s: 'incomes', v: next }])
      },
      async deleteIncome(id) {
        await write([{ t: 'del', s: 'incomes', id }])
      },
      async restore(b) {
        await write([
          { t: 'clear', s: 'incomes' },
          { t: 'clear', s: 'fuels' },
          ...b.fuels.map((v): Op => ({ t: 'put', s: 'fuels', v })),
          ...b.incomes.map((v): Op => ({ t: 'put', s: 'incomes', v })),
        ])
      },
      async eraseAll() {
        await write([{ t: 'clear', s: 'incomes' }, { t: 'clear', s: 'fuels' }])
      },
      backup: () => makeBackup(fuels, incomes),
    }),
    [ready, persistent, fuels, incomes, cycles, orphans, today, write],
  )

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
