import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { makeT, type Key } from './lib/i18n'
import { dateLabel, money as fmtMoney, num as fmtNum, type Lang } from './lib/format'
import type { Fuel, Income } from './lib/logic'
import { ConfirmDialog } from './components/ui'

export type Theme = 'dark' | 'light'
export interface ConfirmOpts {
  title: string
  body?: ReactNode
  confirmLabel?: string
  danger?: boolean
}
type Vars = Record<string, string | number>

interface AppCtx {
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  setTheme: (t: Theme) => void
  t: (k: Key, v?: Vars) => string
  money: (n: number) => string
  date: (s: string, withYear?: boolean) => string
  n: (x: number, max?: number) => string
  toast: (msg: string, tone?: 'ok' | 'err') => void
  confirm: (o: ConfirmOpts) => Promise<boolean>
  fuelForm: { open: boolean; editing?: Fuel }
  incomeForm: { open: boolean; editing?: Income }
  openFuel: (f?: Fuel) => void
  openIncome: (i?: Income) => void
  closeFuel: () => void
  closeIncome: () => void
}

const Ctx = createContext<AppCtx>(null as unknown as AppCtx)
export const useApp = () => useContext(Ctx)

const ls = {
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* storage blocked: preferences just won't persist */
    }
  },
}
export const lsGet = ls.get
export const lsSet = ls.set

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (ls.get('mbt.lang') === 'bn' ? 'bn' : 'en'))
  const [theme, setThemeState] = useState<Theme>(() => (ls.get('mbt.theme') === 'light' ? 'light' : 'dark'))
  const [toasts, setToasts] = useState<{ id: number; msg: string; tone: 'ok' | 'err' }[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const [fuelForm, setFuelForm] = useState<{ open: boolean; editing?: Fuel }>({ open: false })
  const [incomeForm, setIncomeForm] = useState<{ open: boolean; editing?: Income }>({ open: false })
  const toastId = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a1226' : '#f3f6fc')
  }, [theme, lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    ls.set('mbt.lang', l)
  }, [])
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    ls.set('mbt.theme', t)
  }, [])

  const toast = useCallback((msg: string, tone: 'ok' | 'err' = 'ok') => {
    const id = ++toastId.current
    setToasts([{ id, msg, tone }])
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 2600)
  }, [])

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirmState({ ...o, resolve })),
    [],
  )

  const value = useMemo<AppCtx>(
    () => ({
      lang, setLang, theme, setTheme,
      t: makeT(lang),
      money: (n) => fmtMoney(n, lang),
      date: (s, y = true) => dateLabel(s, lang, y),
      n: (x, max = 2) => fmtNum(x, lang, max),
      toast, confirm,
      fuelForm, incomeForm,
      openFuel: (f) => setFuelForm({ open: true, editing: f }),
      openIncome: (i) => setIncomeForm({ open: true, editing: i }),
      closeFuel: () => setFuelForm((s) => ({ ...s, open: false })),
      closeIncome: () => setIncomeForm((s) => ({ ...s, open: false })),
    }),
    [lang, theme, setLang, setTheme, toast, confirm, fuelForm, incomeForm],
  )

  const t = value.t
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((x) => (
          <div
            key={x.id}
            className={`animate-pop rounded-xl border px-4 py-2 text-sm font-medium shadow-xl backdrop-blur ${
              x.tone === 'ok' ? 'border-inc/40 bg-card/95 text-inc' : 'border-exp/40 bg-card/95 text-exp'
            }`}
          >
            {x.msg}
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ''}
        body={confirmState?.body}
        confirmLabel={confirmState?.confirmLabel ?? t('confirm')}
        cancelLabel={t('cancel')}
        danger={confirmState?.danger}
        onCancel={() => {
          confirmState?.resolve(false)
          setConfirmState(null)
        }}
        onConfirm={() => {
          confirmState?.resolve(true)
          setConfirmState(null)
        }}
      />
    </Ctx.Provider>
  )
}
