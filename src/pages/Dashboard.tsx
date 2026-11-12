import { useMemo, useState } from 'react'
import { CalendarDays, Fuel, TrendingUp, Wallet, Bike, ChevronRight } from 'lucide-react'
import { useApp } from '../ctx'
import { useStore } from '../store'
import { Button, Card, Empty, SectionTitle, Stat, Badge } from '../components/ui'
import { BarsChart, Legend, useColors } from '../components/charts'
import { CycleCard } from '../components/lists'
import { groupByDate, monthStats, round2 } from '../lib/logic'

export default function Dashboard({ openCycle }: { openCycle: (n: number) => void }) {
  const app = useApp()
  const { t, money } = app
  const store = useStore()
  const c = useColors()
  const act = store.active
  const prev = store.cycles.length > 1 ? store.cycles[store.cycles.length - 2] : undefined
  const month = monthStats(store.fuels, store.incomes, store.today.slice(0, 7))

  // Date-wise income: defaults to today, any date can be picked.
  const [pick, setPick] = useState('')
  const day = pick || store.today
  const dayRows = store.incomes.filter((i) => i.date === day)
  const dayTotal = round2(dayRows.reduce((s, i) => s + i.amount, 0))
  const dayRide = round2(dayRows.filter((i) => i.source === 'ride').reduce((s, i) => s + i.amount, 0))
  const dayOther = round2(dayTotal - dayRide)

  const daily = useMemo(
    () => (act ? groupByDate(act.incomes).map((g) => ({ label: app.date(g.date, false), income: g.total })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [act, app.lang],
  )
  const perCycle = store.cycles.slice(-6).map((x) => ({
    label: app.lang === 'bn' ? `সা.${app.n(x.number, 0)}` : `C${x.number}`,
    income: x.totalIncome,
    fuel: x.fuel.amount,
  }))

  if (!act) {
    return (
      <div className="pt-6">
        <Empty
          icon={<Bike size={44} />}
          title={t('noCycleTitle')}
          body={t('noCycleBody')}
          action={
            <Button variant="fuel" onClick={() => app.openFuel()}>
              <Fuel size={18} /> {t('addFuel')}
            </Button>
          }
        />
      </div>
    )
  }

  const pos = act.remaining >= 0
  return (
    <div className="animate-fade">
      {/* Current cycle hero */}
      <div className="hero overflow-hidden rounded-3xl border border-line p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-muted">{t('currentCycle')}</span>
          </div>
          <Badge tone="inc">{t('cycleN', { n: app.n(act.number, 0) })}</Badge>
        </div>

        <div className="mt-4 text-xs font-semibold text-muted">{t('incomeAfterFuel')}</div>
        <div className={`text-4xl font-black tabular-nums ${pos ? 'text-inc' : 'text-exp'}`}>{money(act.remaining)}</div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/20">
          <div className="h-full rounded-full bg-inc transition-all duration-700" style={{ width: `${Math.min(100, act.recoveredPct)}%` }} />
        </div>
        <div className="mt-1.5 text-xs text-muted">
          {app.n(Math.round(act.recoveredPct), 0)}% {t('recovered')}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-[11px] font-semibold text-muted">{t('currentFuel')}</div>
            <div className="font-extrabold tabular-nums text-exp">{money(act.fuel.amount)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted">{t('cycleIncome')}</div>
            <div className="font-extrabold tabular-nums text-inc">{money(act.totalIncome)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted">{t('daysInCycle')}</div>
            <div className="font-extrabold tabular-nums">{app.n(act.days, 0)}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <CalendarDays size={14} /> {t('startedOn', { d: app.date(act.fuel.date) })}
          <span className="mx-1">·</span>
          {t('avgPerDay')} {money(act.avgPerDay)}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="income" onClick={() => app.openIncome()}>
            <TrendingUp size={18} /> {t('addIncome')}
          </Button>
          <Button variant="fuel" onClick={() => app.openFuel()}>
            <Fuel size={18} /> {t('addFuel')}
          </Button>
        </div>
      </div>
      <p className="mt-2 px-1 text-[11px] leading-snug text-muted">{t('incomeAfterFuelNote')}</p>

      {/* Today / date-wise income */}
      <SectionTitle>{day === store.today ? t('todayIncome') : t('incomeOnDate', { d: app.date(day) })}</SectionTitle>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-3xl font-black tabular-nums ${dayTotal > 0 ? 'text-inc' : 'text-muted'}`}>{money(dayTotal)}</div>
            <div className="mt-0.5 text-xs text-muted">
              {app.date(day)} · {app.n(dayRows.length, 0)} {t('entries')}
            </div>
          </div>
          <input
            type="date"
            aria-label={t('pickDate')}
            value={day}
            max={store.today}
            onChange={(e) => setPick(e.target.value && e.target.value !== store.today ? e.target.value : '')}
            className="min-h-[44px] w-[9.5rem] rounded-xl border border-line bg-card2 px-2 text-sm text-fg outline-none focus:border-acc"
          />
        </div>
        {dayRows.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="acc">{t('rideSharing')} {money(dayRide)}</Badge>
            {dayOther > 0 && <Badge>{t('other')} {money(dayOther)}</Badge>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">{day === store.today ? t('noIncomeToday') : t('noIncomeOnDate')}</p>
        )}
        {pick && (
          <button className="mt-3 text-xs font-semibold text-acc" onClick={() => setPick('')}>
            {t('backToToday')}
          </button>
        )}
      </Card>

      {/* Month */}
      <SectionTitle>{t('thisMonth')}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('monthIncome')} value={money(month.income)} tone="inc" icon={<TrendingUp size={14} />} />
        <Stat label={t('monthFuel')} value={money(month.fuel)} tone="exp" icon={<Fuel size={14} />} />
        <div className="col-span-2">
          <Stat label={t('monthRemaining')} value={money(month.remaining)} tone={month.remaining >= 0 ? 'inc' : 'exp'} icon={<Wallet size={14} />} />
        </div>
      </div>

      {/* Daily chart for the cycle */}
      <SectionTitle>{t('cycleProgress')}</SectionTitle>
      <Card>
        {daily.length ? (
          <BarsChart data={daily} series={[{ key: 'income', name: t('income'), color: c.inc }]} height={190} />
        ) : (
          <p className="py-6 text-center text-sm text-muted">{t('noIncomeYet')}</p>
        )}
      </Card>

      {/* Cycle comparison */}
      {store.cycles.length > 1 && (
        <>
          <SectionTitle>{t('recentCycles')}</SectionTitle>
          <Card>
            <BarsChart
              data={perCycle}
              series={[
                { key: 'income', name: t('income'), color: c.inc },
                { key: 'fuel', name: t('fuelCost'), color: c.exp },
              ]}
            />
            <Legend items={[{ name: t('income'), color: c.inc }, { name: t('fuelCost'), color: c.exp }]} />
          </Card>
        </>
      )}

      {/* Previous */}
      <SectionTitle
        right={
          prev && (
            <button className="flex items-center text-xs font-semibold text-acc" onClick={() => openCycle(prev.number)}>
              {t('viewCycle')} <ChevronRight size={14} />
            </button>
          )
        }
      >
        {t('previousCycle')}
      </SectionTitle>
      {prev ? <CycleCard c={prev} onOpen={() => openCycle(prev.number)} /> : <Card><p className="text-sm text-muted">{t('noPrevious')}</p></Card>}
    </div>
  )
}
