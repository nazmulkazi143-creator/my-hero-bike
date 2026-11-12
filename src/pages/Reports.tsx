import { useMemo, useState } from 'react'
import { Download, FilterX } from 'lucide-react'
import { useApp } from '../ctx'
import { useStore } from '../store'
import { Button, Card, Empty, Field, Stat, inputCls } from '../components/ui'
import { BarsChart, Legend, useColors } from '../components/charts'
import { dailyReport, filterCycles, filterIncomes, monthlyReport, sourceTotals, type Filters } from '../lib/reports'
import { download, toCsv } from '../lib/csv'
import { monthLabel } from '../lib/format'
import { round2 } from '../lib/logic'

type Rep = 'daily' | 'monthly' | 'compare' | 'fuel' | 'income' | 'remaining'

export default function Reports() {
  const app = useApp()
  const { t, money } = app
  const store = useStore()
  const col = useColors()
  const [rep, setRep] = useState<Rep>('compare')
  const [f, setF] = useState<Filters>({ from: '', to: '', cycle: 0 })

  const rows = useMemo(() => filterIncomes(store.cycles, f), [store.cycles, f])
  const cycles = useMemo(() => filterCycles(store.cycles, f), [store.cycles, f])
  const daily = useMemo(() => dailyReport(store.cycles, f), [store.cycles, f])
  const monthly = useMemo(() => monthlyReport(store.cycles, f), [store.cycles, f])
  const src = sourceTotals(rows)

  const totalIncome = round2(rows.reduce((s, r) => s + r.amount, 0))
  const totalFuel = round2(cycles.reduce((s, c) => s + c.fuel.amount, 0))
  const filtered = f.from || f.to || f.cycle

  if (!store.cycles.length) {
    return <Empty icon={<Download size={40} />} title={t('noCyclesTitle')} body={t('noCyclesBody')} action={<Button variant="fuel" onClick={() => app.openFuel()}>{t('addFuel')}</Button>} />
  }

  const cl = (n: number) => (app.lang === 'bn' ? `সা.${app.n(n, 0)}` : `C${n}`)
  const cycleData = cycles.map((c) => ({ label: cl(c.number), income: c.totalIncome, fuel: c.fuel.amount, after: c.remaining }))

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10)
    let name = `bike-${rep}-${stamp}.csv`
    let csv = ''
    if (rep === 'daily') {
      csv = toCsv([t('csvDate'), t('csvIncome'), t('csvCount'), t('csvCycle')], daily.map((d) => [d.date, d.total, d.count, [...d.cycles].join('/')]))
    } else if (rep === 'monthly') {
      csv = toCsv([t('csvMonth'), t('csvTotalIncome'), t('csvFuel'), t('csvRemaining')], monthly.map((m) => [m.month, m.income, m.fuel, m.after]))
    } else if (rep === 'income') {
      csv = toCsv(
        [t('csvCycle'), t('csvDate'), t('csvIncome'), t('csvSource'), t('csvNotes')],
        rows.map((r) => [r.cycleNumber, r.date, r.amount, r.source === 'ride' ? 'Ride Sharing' : 'Other', r.notes]),
      )
    } else if (rep === 'fuel') {
      csv = toCsv(
        [t('csvCycle'), t('csvFuelDate'), t('csvFuelAmount'), t('csvLiters'), t('csvPpl'), t('csvOdo'), t('csvNotes')],
        cycles.map((c) => [c.number, c.fuel.date, c.fuel.amount, c.fuel.liters, c.fuel.liters ? round2(c.fuel.amount / c.fuel.liters) : '', c.fuel.odometer, c.fuel.notes]),
      )
    } else {
      name = `bike-cycles-${stamp}.csv`
      csv = toCsv(
        [t('csvCycle'), t('csvFuelDate'), t('csvFuelAmount'), t('csvTotalIncome'), t('csvRemaining'), t('csvDays'), t('csvStatus')],
        cycles.map((c) => [c.number, c.fuel.date, c.fuel.amount, c.totalIncome, c.remaining, c.days, c.status === 'active' ? 'Active' : 'Completed']),
      )
    }
    download(name, csv)
    app.toast(t('exported'))
  }

  const tabs: { v: Rep; l: string }[] = [
    { v: 'compare', l: t('repCompare') },
    { v: 'daily', l: t('repDaily') },
    { v: 'monthly', l: t('repMonthly') },
    { v: 'income', l: t('repIncome') },
    { v: 'fuel', l: t('repFuel') },
    { v: 'remaining', l: t('repRemaining') },
  ]

  const noData = (rep === 'daily' && !daily.length) || (rep === 'monthly' && !monthly.length) || (rep === 'income' && !rows.length) || ((rep === 'fuel' || rep === 'compare' || rep === 'remaining') && !cycles.length)

  return (
    <div className="animate-fade space-y-4">
      <h1 className="text-xl font-extrabold">{t('reports')}</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {tabs.map((x) => (
          <button
            key={x.v}
            onClick={() => setRep(x.v)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${rep === x.v ? 'border-acc bg-acc text-white' : 'border-line bg-card text-muted hover:text-fg'}`}
          >
            {x.l}
          </button>
        ))}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fromDate')}>
            <input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          </Field>
          <Field label={t('toDate')}>
            <input type="date" className={inputCls} value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
          </Field>
          <Field label={t('filterCycle')}>
            <select className={inputCls} value={f.cycle} onChange={(e) => setF({ ...f, cycle: Number(e.target.value) })}>
              <option value={0}>{t('all')}</option>
              {[...store.cycles].reverse().map((c) => (
                <option key={c.number} value={c.number}>{t('cycleN', { n: app.n(c.number, 0) })}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button variant="soft" className="w-full" disabled={!filtered} onClick={() => setF({ from: '', to: '', cycle: 0 })}>
              <FilterX size={16} /> {t('clearFilters')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('totalIncome')} value={money(totalIncome)} tone="inc" />
        <Stat label={t('fuelPurchases')} value={money(totalFuel)} tone="exp" />
        <Stat label={t('incomeAfterFuel')} value={money(round2(totalIncome - totalFuel))} tone={totalIncome - totalFuel >= 0 ? 'inc' : 'exp'} />
      </div>

      {noData ? (
        <Card><p className="py-6 text-center text-sm text-muted">{t('noData')}</p></Card>
      ) : (
        <>
          {rep === 'compare' && (
            <>
              <Card>
                <div className="mb-2 text-sm font-bold">{t('incomeVsFuel')}</div>
                <BarsChart data={cycleData} series={[{ key: 'income', name: t('income'), color: col.inc }, { key: 'fuel', name: t('fuelCost'), color: col.exp }]} />
                <Legend items={[{ name: t('income'), color: col.inc }, { name: t('fuelCost'), color: col.exp }]} />
              </Card>
              <CycleTable />
            </>
          )}

          {rep === 'remaining' && (
            <>
              <Card>
                <div className="mb-2 text-sm font-bold">{t('incomeAfterFuel')}</div>
                <BarsChart data={cycleData} series={[{ key: 'after', name: t('incomeAfterFuel'), color: col.inc }]} zeroLine />
              </Card>
              <CycleTable />
              <p className="px-1 text-[11px] text-muted">{t('incomeAfterFuelNote')}</p>
            </>
          )}

          {rep === 'fuel' && (
            <>
              <Card>
                <BarsChart data={cycleData} series={[{ key: 'fuel', name: t('fuelCost'), color: col.exp }]} />
              </Card>
              <Table
                head={[t('csvCycle'), t('csvFuelDate'), t('fuelCost')]}
                body={cycles.map((c) => [app.n(c.number, 0), app.date(c.fuel.date), <span className="font-bold text-exp">{money(c.fuel.amount)}</span>])}
                foot={[t('total'), '', <span className="font-extrabold text-exp">{money(totalFuel)}</span>]}
              />
            </>
          )}

          {rep === 'income' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label={t('rideTotal')} value={money(src.ride)} tone="inc" />
                <Stat label={t('otherTotal')} value={money(src.other)} tone="inc" />
              </div>
              <Card>
                <BarsChart data={cycleData} series={[{ key: 'income', name: t('income'), color: col.inc }]} />
              </Card>
              <Table
                head={[t('csvCycle'), t('csvDate'), t('income')]}
                body={[...rows].reverse().map((r) => [app.n(r.cycleNumber, 0), app.date(r.date), <span className="font-bold text-inc">{money(r.amount)}</span>])}
                foot={[t('total'), '', <span className="font-extrabold text-inc">{money(totalIncome)}</span>]}
              />
            </>
          )}

          {rep === 'daily' && (
            <>
              <Card>
                <BarsChart data={daily.slice(-31).map((d) => ({ label: app.date(d.date, false), income: d.total }))} series={[{ key: 'income', name: t('income'), color: col.inc }]} />
              </Card>
              <Table
                head={[t('csvDate'), t('csvCycle'), t('income')]}
                body={[...daily].reverse().map((d) => [app.date(d.date), [...d.cycles].map((n) => app.n(n, 0)).join(', '), <span className="font-bold text-inc">{money(d.total)}</span>])}
                foot={[t('total'), '', <span className="font-extrabold text-inc">{money(totalIncome)}</span>]}
              />
            </>
          )}

          {rep === 'monthly' && (
            <>
              <Card>
                <BarsChart
                  data={monthly.map((m) => ({ label: monthLabel(m.month, app.lang), income: m.income, fuel: m.fuel }))}
                  series={[{ key: 'income', name: t('income'), color: col.inc }, { key: 'fuel', name: t('fuelCost'), color: col.exp }]}
                />
                <Legend items={[{ name: t('income'), color: col.inc }, { name: t('fuelCost'), color: col.exp }]} />
              </Card>
              <Table
                head={[t('csvMonth'), t('income'), t('fuelCost'), t('incomeAfterFuel')]}
                body={[...monthly].reverse().map((m) => [
                  monthLabel(m.month, app.lang),
                  <span className="font-bold text-inc">{money(m.income)}</span>,
                  <span className="font-bold text-exp">{money(m.fuel)}</span>,
                  <span className={`font-bold ${m.after >= 0 ? 'text-inc' : 'text-exp'}`}>{money(m.after)}</span>,
                ])}
              />
            </>
          )}

          <Button variant="soft" className="w-full" onClick={exportCsv}>
            <Download size={18} /> {t('exportCsv')}
          </Button>
          {(rep === 'compare' || rep === 'remaining' || rep === 'fuel') && <p className="px-1 text-[11px] text-muted">{t('tableFilterNote')}</p>}
        </>
      )}
    </div>
  )

  function CycleTable() {
    return (
      <Table
        head={[t('csvCycle'), t('fuelCost'), t('income'), t('incomeAfterFuel')]}
        body={[...cycles].reverse().map((c) => [
          `${app.n(c.number, 0)}${c.status === 'active' ? ' •' : ''}`,
          <span className="font-bold text-exp">{money(c.fuel.amount)}</span>,
          <span className="font-bold text-inc">{money(c.totalIncome)}</span>,
          <span className={`font-bold ${c.remaining >= 0 ? 'text-inc' : 'text-exp'}`}>{money(c.remaining)}</span>,
        ])}
      />
    )
  }
}

function Table({ head, body, foot }: { head: string[]; body: React.ReactNode[][]; foot?: React.ReactNode[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
            {head.map((h, i) => (
              <th key={i} className={`px-3 py-2.5 font-semibold ${i ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j ? 'text-right' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-2 border-line bg-card2/50">
              {foot.map((c, j) => (
                <td key={j} className={`px-3 py-2 font-bold ${j ? 'text-right' : ''}`}>{c}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
