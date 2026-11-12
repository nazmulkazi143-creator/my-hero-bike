import { useEffect, useMemo, useState } from 'react'
import { Fuel as FuelIcon, TrendingUp } from 'lucide-react'
import { useApp } from '../ctx'
import { useStore } from '../store'
import { Button, Field, Seg, Sheet, inputCls } from './ui'
import { parseNumber } from '../lib/format'
import { isDate, round2, validateFuelDate, type Source } from '../lib/logic'

/* ---------- Add / edit fuel purchase ---------- */

export function FuelSheet() {
  const app = useApp()
  const { t, money } = app
  const { open, editing } = app.fuelForm
  const store = useStore()
  const [date, setDate] = useState(store.today)
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [odo, setOdo] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubmitted(false)
    setBusy(false)
    if (editing) {
      setDate(editing.date)
      setAmount(String(editing.amount))
      setLiters(editing.liters != null ? String(editing.liters) : '')
      setOdo(editing.odometer != null ? String(editing.odometer) : '')
      setNotes(editing.notes ?? '')
    } else {
      setDate(store.today)
      setAmount('')
      setLiters('')
      setOdo('')
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  const sorted = useMemo(() => [...store.fuels].sort((a, b) => a.seq - b.seq), [store.fuels])
  const idx = editing ? sorted.findIndex((f) => f.id === editing.id) : sorted.length
  const prev = sorted[idx - 1]
  const next = editing ? sorted[idx + 1] : undefined

  const amt = parseNumber(amount)
  const ltr = liters.trim() === '' ? null : parseNumber(liters)
  const odoN = odo.trim() === '' ? null : parseNumber(odo)
  const ppl = amt && ltr && ltr > 0 ? round2(amt / ltr) : null

  const errors = {
    date: !isDate(date)
      ? t('errDate')
      : (() => {
          const e = validateFuelDate(store.fuels, date, store.today, editing?.id)
          return e === 'future' ? t('errFuture') : e === 'beforePrev' ? t('errBeforePrev') : e === 'afterNext' ? t('errAfterNext') : null
        })(),
    amount: amt == null || amt <= 0 ? t('errAmount') : null,
    liters: ltr === null && liters.trim() !== '' ? t('errNumber') : ltr !== null && ltr <= 0 ? t('errAmount') : null,
    odo:
      odoN === null && odo.trim() !== ''
        ? t('errNumber')
        : odoN !== null && prev?.odometer != null && odoN < prev.odometer
          ? t('errOdoLower', { v: prev.odometer })
          : odoN !== null && next?.odometer != null && odoN > next.odometer
            ? t('errOdoHigher', { v: next.odometer })
            : null,
  }
  const valid = !errors.date && !errors.amount && !errors.liters && !errors.odo
  const show = (e: string | null) => (submitted ? e : null)

  async function submit() {
    setSubmitted(true)
    if (!valid || amt == null || busy) return
    const input = {
      date, amount: amt,
      liters: ltr && ltr > 0 ? ltr : undefined,
      odometer: odoN ?? undefined,
      notes,
    }
    setBusy(true)
    try {
      if (editing) {
        await store.updateFuel(editing.id, input)
        app.toast(t('savedFuelEdit'))
      } else {
        const act = store.active
        if (act) {
          const ok = await app.confirm({
            title: t('newCycleTitle'),
            confirmLabel: t('continueBtn'),
            body: (
              <div className="space-y-3">
                <p>{t('newCycleBody')}</p>
                <div className="rounded-xl border border-line bg-bg p-3 text-fg">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{t('closingCycle', { n: app.n(act.number, 0) })}</div>
                  <Row label={t('finalIncome')} value={money(act.totalIncome)} cls="text-inc" />
                  <Row label={t('finalFuel')} value={money(act.fuel.amount)} cls="text-exp" />
                  <div className="my-1.5 border-t border-line" />
                  <Row label={t('finalResult')} value={money(act.remaining)} cls={act.remaining >= 0 ? 'text-inc' : 'text-exp'} bold />
                </div>
              </div>
            ),
          })
          if (!ok) {
            setBusy(false)
            return
          }
        }
        await store.addFuel(input)
        app.toast(act ? t('savedFuelNew', { n: app.n(act.number, 0) }) : t('savedFuelFirst'))
      }
      app.closeFuel()
    } catch {
      app.toast(t('saveFailed'), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={app.closeFuel} title={editing ? t('editFuel') : store.active ? t('startNewCycle') : t('addFuel')}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('fuelDate')} error={show(errors.date)}>
          <input type="date" className={inputCls} value={date} max={store.today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t('fuelAmount')} error={show(errors.amount)}>
          <input
            className={`${inputCls} text-xl font-bold text-exp`}
            inputMode="decimal"
            autoFocus
            placeholder="500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t('fuelLiters')}`} error={show(errors.liters)} hint={t('optional')}>
            <input className={inputCls} inputMode="decimal" placeholder="4.5" value={liters} onChange={(e) => setLiters(e.target.value)} />
          </Field>
          <Field label={t('pricePerLiter')} hint={t('autoCalculated')}>
            <div className={`${inputCls} flex items-center font-bold tabular-nums ${ppl ? 'text-fg' : 'text-muted/60'}`}>
              {ppl ? `${money(ppl)}` : '—'}
            </div>
          </Field>
        </div>
        <Field label={t('odometer')} error={show(errors.odo)} hint={t('optional')}>
          <input className={inputCls} inputMode="numeric" placeholder="12500" value={odo} onChange={(e) => setOdo(e.target.value)} />
        </Field>
        <Field label={t('fuelNotes')}>
          <input className={inputCls} placeholder={t('fuelNotesPh')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
        </Field>
        <Button type="submit" variant="fuel" className="w-full" disabled={busy}>
          <FuelIcon size={18} /> {editing ? t('save') : store.active ? t('startNewCycle') : t('save')}
        </Button>
      </form>
    </Sheet>
  )
}

function Row({ label, value, cls, bold }: { label: string; value: string; cls: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tabular-nums ${bold ? 'text-base font-extrabold' : 'font-bold'} ${cls}`}>{value}</span>
    </div>
  )
}

/* ---------- Add / edit income ---------- */

export function IncomeSheet() {
  const app = useApp()
  const { t, money } = app
  const { open, editing } = app.incomeForm
  const store = useStore()
  const [date, setDate] = useState(store.today)
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<Source>('ride')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubmitted(false)
    setBusy(false)
    if (editing) {
      setDate(editing.date)
      setAmount(String(editing.amount))
      setSource(editing.source)
      setNotes(editing.notes ?? '')
    } else {
      setDate(store.today)
      setAmount('')
      setSource('ride')
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing])

  // The cycle this income belongs to: its own cycle when editing, the active one when adding.
  const cycle = editing ? store.cycles.find((c) => c.fuel.id === editing.fuelId) : store.active
  const amt = parseNumber(amount)

  const errors = {
    date: !isDate(date)
      ? t('errDate')
      : date > store.today
        ? t('errFuture')
        : cycle && date < cycle.fuel.date
          ? t('errIncomeBeforeFuel', { d: app.date(cycle.fuel.date) })
          : cycle?.endDate && date > cycle.endDate
            ? t('errIncomeAfterEnd', { d: app.date(cycle.endDate) })
            : null,
    amount: amt == null || amt <= 0 ? t('errAmount') : null,
  }
  const valid = !errors.date && !errors.amount

  async function submit() {
    setSubmitted(true)
    if (!valid || amt == null || !cycle || busy) return
    setBusy(true)
    try {
      if (editing) {
        await store.updateIncome(editing.id, { date, amount: amt, source, notes })
        app.toast(t('savedIncomeEdit'))
      } else {
        await store.addIncome({ date, amount: amt, source, notes })
        app.toast(t('savedIncome'))
      }
      app.closeIncome()
    } catch {
      app.toast(t('saveFailed'), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={app.closeIncome} title={editing ? t('editIncome') : t('addIncome')}>
      {!cycle ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('needFuelFirst')}</p>
          <Button
            variant="fuel"
            className="w-full"
            onClick={() => {
              app.closeIncome()
              app.openFuel()
            }}
          >
            <FuelIcon size={18} /> {t('addFuel')}
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs text-muted">
            {editing
              ? t('incomeBelongs', { n: app.n(cycle.number, 0) })
              : t('belongsTo', { n: app.n(cycle.number, 0), amount: app.n(cycle.fuel.amount) })}
          </div>
          <Field label={t('incomeAmount')} error={submitted ? errors.amount : null}>
            <input
              className={`${inputCls} text-2xl font-extrabold text-inc`}
              inputMode="decimal"
              autoFocus
              placeholder="700"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label={t('incomeDate')} error={submitted ? errors.date : null}>
            <input type="date" className={inputCls} value={date} max={store.today} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('incomeSource')}>
            <Seg
              value={source}
              onChange={setSource}
              options={[
                { value: 'ride', label: t('rideSharing') },
                { value: 'other', label: t('other') },
              ]}
            />
          </Field>
          <Field label={t('incomeNotes')}>
            <input className={inputCls} placeholder={t('incomeNotesPh')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
          </Field>
          <Button type="submit" variant="income" className="w-full" disabled={busy}>
            <TrendingUp size={18} /> {t('save')}
            {amt && amt > 0 ? ` ${money(amt)}` : ''}
          </Button>
        </form>
      )}
    </Sheet>
  )
}
