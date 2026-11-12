import { useState } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import { useApp } from '../ctx'
import { useStore } from '../store'
import { Button, Card, Empty, Field, inputCls, Stat } from '../components/ui'
import { IncomeList } from '../components/lists'

export default function IncomePage() {
  const app = useApp()
  const { t, money } = app
  const store = useStore()
  const [sel, setSel] = useState<number>(0) // 0 = active cycle

  const cycle = sel ? store.cycles.find((c) => c.number === sel) : store.active
  const isActive = !cycle || cycle.status === 'active'

  if (!store.active) {
    return (
      <Empty
        icon={<TrendingUp size={40} />}
        title={t('noCycleTitle')}
        body={t('needFuelFirst')}
        action={<Button variant="fuel" onClick={() => app.openFuel()}>{t('addFuel')}</Button>}
      />
    )
  }

  return (
    <div className="animate-fade space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t('incomeHistory')}</h1>
        {store.cycles.length > 1 && (
          <div className="w-40">
            <Field label={t('filterCycle')}>
              <select className={`${inputCls} min-h-[40px] py-0 text-sm`} value={sel} onChange={(e) => setSel(Number(e.target.value))}>
                <option value={0}>{t('active')}</option>
                {[...store.cycles].reverse().map((c) => (
                  <option key={c.number} value={c.number}>
                    {t('cycleN', { n: app.n(c.number, 0) })}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>

      {cycle && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('totalIncome')} value={money(cycle.totalIncome)} tone="inc" sub={`${app.n(cycle.incomes.length, 0)} ${t('entries')}`} />
          <Stat label={t('incomeAfterFuel')} value={money(cycle.remaining)} tone={cycle.remaining >= 0 ? 'inc' : 'exp'} sub={`${t('fuelCost')} ${money(cycle.fuel.amount)}`} />
        </div>
      )}

      {isActive && (
        <Button variant="income" className="w-full" onClick={() => app.openIncome()}>
          <Plus size={18} /> {t('addIncome')}
        </Button>
      )}

      {cycle && cycle.incomes.length ? (
        <IncomeList rows={cycle.incomes} />
      ) : (
        <Card>
          <p className="py-4 text-center text-sm text-muted">{t('noIncomeBody')}</p>
        </Card>
      )}
    </div>
  )
}
