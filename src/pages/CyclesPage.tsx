import { useState } from 'react'
import { ArrowLeft, Fuel, Pencil, Trash2, History } from 'lucide-react'
import { useApp } from '../ctx'
import { useStore } from '../store'
import { Badge, Button, Card, Empty, IconButton, Seg, Stat } from '../components/ui'
import { CycleBadge, CycleCard, IncomeList } from '../components/lists'
import { BarsChart, useColors } from '../components/charts'
import { useActions } from '../components/actions'
import { groupByDate, round2 } from '../lib/logic'

type Tab = 'cycles' | 'fuel' | 'income'

export default function CyclesPage({ selected, setSelected }: { selected: number | null; setSelected: (n: number | null) => void }) {
  const app = useApp()
  const { t, money } = app
  const store = useStore()
  const [tab, setTab] = useState<Tab>('cycles')
  const { removeFuel } = useActions()

  const detail = selected != null ? store.cycles.find((c) => c.number === selected) : undefined
  if (detail) return <CycleDetail number={detail.number} onBack={() => setSelected(null)} />

  if (!store.cycles.length) {
    return (
      <Empty
        icon={<History size={40} />}
        title={t('noCyclesTitle')}
        body={t('noCyclesBody')}
        action={<Button variant="fuel" onClick={() => app.openFuel()}>{t('addFuel')}</Button>}
      />
    )
  }

  const list = [...store.cycles].reverse()
  const allIncome = store.cycles.flatMap((c) => c.incomes.map((i) => ({ ...i, cycleNumber: c.number })))

  return (
    <div className="animate-fade space-y-4">
      <h1 className="text-xl font-extrabold">{tab === 'cycles' ? t('cycleHistory') : t('history')}</h1>
      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { value: 'cycles', label: t('tabCycles') },
          { value: 'fuel', label: t('tabFuel') },
          { value: 'income', label: t('tabIncome') },
        ]}
      />

      {tab === 'cycles' && list.map((c) => <CycleCard key={c.fuel.id} c={c} onOpen={() => setSelected(c.number)} />)}

      {tab === 'fuel' &&
        list.map((c) => {
          const ppl = c.fuel.liters ? round2(c.fuel.amount / c.fuel.liters) : null
          return (
            <Card key={c.fuel.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-extrabold tabular-nums text-exp">{money(c.fuel.amount)}</div>
                  <div className="text-xs text-muted">{app.date(c.fuel.date)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge>{t('cycleN', { n: app.n(c.number, 0) })}</Badge>
                  <IconButton aria-label={t('edit')} onClick={() => app.openFuel(c.fuel)}><Pencil size={17} /></IconButton>
                  <IconButton aria-label={t('delete')} className="hover:text-exp" onClick={() => removeFuel(c.fuel, c)}><Trash2 size={17} /></IconButton>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {c.fuel.liters != null && <span>{app.n(c.fuel.liters)} {t('liters')}</span>}
                {ppl != null && <span>{money(ppl)}/{t('liters')}</span>}
                {c.fuel.odometer != null && <span>{app.n(c.fuel.odometer, 0)} {t('km')}</span>}
              </div>
              {c.fuel.notes && <div className="mt-1 text-xs text-muted">{c.fuel.notes}</div>}
            </Card>
          )
        })}

      {tab === 'income' && (allIncome.length ? <IncomeList rows={allIncome} showCycle /> : <Card><p className="py-4 text-center text-sm text-muted">{t('noIncomeTitle')}</p></Card>)}
    </div>
  )
}

function CycleDetail({ number, onBack }: { number: number; onBack: () => void }) {
  const app = useApp()
  const { t, money } = app
  const store = useStore()
  const col = useColors()
  const { removeFuel } = useActions()
  const c = store.cycles.find((x) => x.number === number)!
  const pos = c.remaining >= 0
  const daily = groupByDate(c.incomes).map((g) => ({ label: app.date(g.date, false), income: g.total }))

  return (
    <div className="animate-fade space-y-4">
      <div className="flex items-center gap-2">
        <IconButton aria-label={t('back')} onClick={onBack}><ArrowLeft size={22} /></IconButton>
        <h1 className="text-xl font-extrabold">{t('cycleN', { n: app.n(c.number, 0) })}</h1>
        <CycleBadge c={c} />
      </div>

      <div className="hero rounded-3xl border border-line p-5">
        <div className="text-xs font-semibold text-muted">{c.status === 'completed' ? t('finalResults') : t('currentCycle')}</div>
        <div className="mt-2 text-xs font-semibold text-muted">{t('incomeAfterFuel')}</div>
        <div className={`text-4xl font-black tabular-nums ${pos ? 'text-inc' : 'text-exp'}`}>{money(c.remaining)}</div>
        <div className="mt-3 text-xs text-muted">
          {money(c.totalIncome)} − {money(c.fuel.amount)}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/20">
          <div className={`h-full rounded-full ${pos ? 'bg-inc' : 'bg-exp'}`} style={{ width: `${Math.min(100, c.recoveredPct)}%` }} />
        </div>
      </div>
      <p className="px-1 text-[11px] text-muted">{t('incomeAfterFuelNote')}</p>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('fuelPurchaseAmount')} value={money(c.fuel.amount)} tone="exp" sub={app.date(c.fuel.date)} />
        <Stat label={t('totalIncome')} value={money(c.totalIncome)} tone="inc" sub={`${app.n(c.incomes.length, 0)} ${t('entries')}`} />
        <Stat label={t('days')} value={app.n(c.days, 0)} sub={c.endDate ? t('endedOn', { d: app.date(c.endDate) }) : t('active')} />
        <Stat label={t('avgPerDay')} value={money(c.avgPerDay)} sub={`${t('daysWithIncome')}: ${app.n(c.incomeDays, 0)}`} />
        {c.distance != null && <Stat label={t('distance')} value={`${app.n(c.distance, 0)} ${t('km')}`} />}
        {c.fuel.liters != null && <Stat label={t('liters')} value={app.n(c.fuel.liters)} sub={`${money(round2(c.fuel.amount / c.fuel.liters))}/${t('liters')}`} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="soft" onClick={() => app.openFuel(c.fuel)}><Pencil size={16} /> {t('editFuel')}</Button>
        <Button
          variant="danger"
          onClick={async () => {
            if (await removeFuel(c.fuel, c)) onBack()
          }}
        >
          <Trash2 size={16} /> {t('delete')}
        </Button>
      </div>

      {daily.length > 0 && (
        <Card>
          <div className="mb-2 text-sm font-bold">{t('dailyIncomeOfCycle')}</div>
          <BarsChart data={daily} series={[{ key: 'income', name: t('income'), color: col.inc }]} height={180} />
        </Card>
      )}

      {c.incomes.length ? (
        <IncomeList rows={c.incomes} />
      ) : (
        <Card><p className="py-4 text-center text-sm text-muted">{t('noIncomeYet')}</p></Card>
      )}

      {c.status === 'active' && (
        <Button variant="income" className="w-full" onClick={() => app.openIncome()}>{t('addIncome')}</Button>
      )}
      <div className="flex justify-center pb-2 text-xs text-muted"><Fuel size={12} className="mr-1" /> {t('aboutBody')}</div>
    </div>
  )
}
