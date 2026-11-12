import type { Fuel, Income } from './logic'

export type StoreName = 'fuels' | 'incomes'

export type Op =
  | { t: 'put'; s: 'fuels'; v: Fuel }
  | { t: 'put'; s: 'incomes'; v: Income }
  | { t: 'del'; s: StoreName; id: string }
  | { t: 'clear'; s: StoreName }

export interface Db {
  /** false when IndexedDB is unavailable and data only lives in memory. */
  persistent: boolean
  getAll<T>(s: StoreName): Promise<T[]>
  /** All operations in a batch succeed or fail together (single transaction). */
  batch(ops: Op[]): Promise<void>
}

const DB_NAME = 'my-bike-tracker'

export function createMemoryDb(): Db {
  const stores: Record<StoreName, Map<string, unknown>> = { fuels: new Map(), incomes: new Map() }
  return {
    persistent: false,
    async getAll<T>(s: StoreName) {
      return [...stores[s].values()].map((v) => structuredClone(v) as T)
    },
    async batch(ops) {
      for (const op of ops) {
        if (op.t === 'put') stores[op.s].set(op.v.id, structuredClone(op.v))
        else if (op.t === 'del') stores[op.s].delete(op.id)
        else stores[op.s].clear()
      }
    },
  }
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const d = req.result
      d.createObjectStore('fuels', { keyPath: 'id' })
      const inc = d.createObjectStore('incomes', { keyPath: 'id' })
      inc.createIndex('fuelId', 'fuelId')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked'))
  })
}

export async function openDb(): Promise<Db> {
  try {
    const idb = await openIdb()
    const db: Db = {
      persistent: true,
      getAll<T>(s: StoreName) {
        return new Promise<T[]>((resolve, reject) => {
          const req = idb.transaction(s, 'readonly').objectStore(s).getAll()
          req.onsuccess = () => resolve(req.result as T[])
          req.onerror = () => reject(req.error)
        })
      },
      batch(ops) {
        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(['fuels', 'incomes'], 'readwrite')
          for (const op of ops) {
            const st = tx.objectStore(op.s)
            if (op.t === 'put') st.put(op.v)
            else if (op.t === 'del') st.delete(op.id)
            else st.clear()
          }
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
        })
      },
    }
    await db.getAll('fuels') // probe: make sure transactions actually work here
    try {
      await navigator.storage?.persist?.()
    } catch {
      /* best effort */
    }
    return db
  } catch {
    return createMemoryDb()
  }
}
