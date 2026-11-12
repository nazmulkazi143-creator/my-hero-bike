import { useState } from 'react'
import { BarChart3, Bike, History, Home, Languages, Moon, Plus, Settings as Cog, Sun, TrendingUp } from 'lucide-react'
import { useApp } from './ctx'
import { useStore } from './store'
import { FuelSheet, IncomeSheet } from './components/Forms'
import { IconButton } from './components/ui'
import Dashboard from './pages/Dashboard'
import IncomePage from './pages/IncomePage'
import CyclesPage from './pages/CyclesPage'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

type Page = 'home' | 'income' | 'cycles' | 'reports' | 'settings'

export default function App() {
  const app = useApp()
  const store = useStore()
  const { t } = app
  const [page, setPage] = useState<Page>('home')
  const [selected, setSelected] = useState<number | null>(null)

  const go = (p: Page) => {
    setPage(p)
    if (p !== 'cycles') setSelected(null)
    window.scrollTo({ top: 0 })
  }

  const nav: { id: Page; icon: typeof Home; label: string }[] = [
    { id: 'home', icon: Home, label: t('navHome') },
    { id: 'income', icon: TrendingUp, label: t('navIncome') },
    { id: 'cycles', icon: History, label: t('navCycles') },
    { id: 'reports', icon: BarChart3, label: t('navReports') },
    { id: 'settings', icon: Cog, label: t('navSettings') },
  ]

  if (!store.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Bike className="mr-2 animate-pulse" /> {t('loading')}
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-xl">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-acc/15 text-acc">
            <Bike size={20} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold">{t('appName')}</div>
            <div className="hidden text-[11px] text-muted min-[380px]:block">{t('tagline')}</div>
          </div>
        </div>
        <div className="flex items-center">
          <IconButton aria-label={t('language')} onClick={() => app.setLang(app.lang === 'en' ? 'bn' : 'en')} className="w-auto gap-1 px-2 text-xs font-bold">
            <Languages size={17} /> {app.lang === 'en' ? 'বাংলা' : 'EN'}
          </IconButton>
          <IconButton aria-label={t('theme')} onClick={() => app.setTheme(app.theme === 'dark' ? 'light' : 'dark')}>
            {app.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </IconButton>
        </div>
      </header>

      {!store.persistent && page !== 'settings' && (
        <button onClick={() => go('settings')} className="block w-full bg-exp/15 px-4 py-2 text-left text-xs font-semibold text-exp">
          {t('storageMemory')}
        </button>
      )}

      <main className="pb-safe px-4 pt-4">
        {page === 'home' && <Dashboard openCycle={(n) => { setSelected(n); setPage('cycles') }} />}
        {page === 'income' && <IncomePage />}
        {page === 'cycles' && <CyclesPage selected={selected} setSelected={setSelected} />}
        {page === 'reports' && <Reports />}
        {page === 'settings' && <Settings />}
      </main>

      {store.active && (page === 'home' || page === 'income') && (
        <button
          aria-label={t('addIncome')}
          onClick={() => app.openIncome()}
          className="fixed bottom-[calc(4.9rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 animate-pop items-center justify-center rounded-full bg-inc text-[#04210f] shadow-xl shadow-black/40 transition active:scale-90 sm:right-[max(1rem,calc(50%-18rem))]"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      <nav className="nav-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {nav.map((n) => {
            const on = page === n.id
            return (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${on ? 'text-acc' : 'text-muted hover:text-fg'}`}
              >
                <n.icon size={22} strokeWidth={on ? 2.6 : 2} />
                {n.label}
              </button>
            )
          })}
        </div>
      </nav>

      <FuelSheet />
      <IncomeSheet />
    </div>
  )
}
