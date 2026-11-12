import { Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../ctx'
import { IconButton, Badge } from './ui'
import { useActions } from './actions'
import type { Cycle, Income } from '../lib/logic'
import { weekdayLabel } from '../lib/format'

export type IncomeRowT = Income & { cycleNumber?: number }

/** Income entries grouped by date (newest first) with edit / delete on every row. */
export function IncomeList({ rows, showCycle = false }: { rows: IncomeRowT[]; showCycle?: boolean }) {
  const app = useApp()
  const { t, money } = app
  const { removeIncome } = useActions()

  const groups = new Map<string, IncomeRowT[]>()
  for (const r of rows) groups.set(r.date, [...(groups.get(r.date) ?? []), r])
  const days = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))

  return (
    <div className="space-y-3">
      {days.map(([date, items]) => {
        const total = items.reduce((s, i) => s + i.amount, 0)
        return (
          <div key={date} className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center justify-between bg-card2/60 px-4 py-2">
              <div>
                <div className="text-sm font-bold">{app.date(date)}</div>
                <div className="text-xs text-muted">{weekdayLabel(date, app.lang)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t('dayTotal')}</div>
                <div className="font-extrabold tabular-nums text-inc">{money(total)}</div>
              </div>
            </div>
            <ul className="divide-y divide-line">
              {[...items].sort((a, b) => b.createdAt - a.createdAt).map((i) => (
                <li key={i.id} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold tabular-nums text-inc">{money(i.amount)}</span>
                      <Badge tone={i.source === 'ride' ? 'acc' : 'muted'}>{i.source === 'ride' ? t('rideSharing') : t('other')}</Badge>
                      {showCycle && i.cycleNumber != null && <Badge>{t('cycleN', { n: app.n(i.cycleNumber, 0) })}</Badge>}
                    </div>
                    {i.notes && <div className="mt-0.5 truncate text-xs text-muted">{i.notes}</div>}
                  </div>
                  <IconButton aria-label={t('edit')} onClick={() => app.openIncome(i)}>
                    <Pencil size={17} />
                  </IconButton>
                  <IconButton aria-label={t('delete')} className="hover:text-exp" onClick={() => removeIncome(i)}>
                    <Trash2 size={17} />
                  </IconButton>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function CycleBadge({ c }: { c: Cycle }) {
  const { t } = useApp()
  return <Badge tone={c.status === 'active' ? 'inc' : 'muted'}>{c.status === 'active' ? t('active') : t('completed')}</Badge>
}

/** Compact summary card for a fuel cycle. */
export function CycleCard({ c, onOpen }: { c: Cycle; onOpen?: () => void }) {
  const app = useApp()
  const { t, money } = app
  const pos = c.remaining >= 0
  const body = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold">{t('cycleN', { n: app.n(c.number, 0) })}</span>
          <CycleBadge c={c} />
        </div>
        <span className="text-xs text-muted">{app.date(c.fuel.date)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <Mini label={t('fuelCost')} value={money(c.fuel.amount)} cls="text-exp" />
        <Mini label={t('totalIncome')} value={money(c.totalIncome)} cls="text-inc" />
        <Mini label={t('incomeAfterFuel')} value={money(c.remaining)} cls={pos ? 'text-inc' : 'text-exp'} />
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card2">
        <div className={`h-full rounded-full ${pos ? 'bg-inc' : 'bg-exp'}`} style={{ width: `${Math.min(100, c.recoveredPct)}%`, transition: 'width .5s' }} />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted">
        <span>{t(c.days === 1 ? 'daysN1' : 'daysN', { n: app.n(c.days, 0) })}</span>
        <span>{t('avgPerDay')} {money(c.avgPerDay)}</span>
      </div>
    </>
  )
  return (
    <div
      className={`rounded-2xl border border-line bg-card p-4 ${onOpen ? 'cursor-pointer transition active:scale-[.99] hover:border-acc/50' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
    >
      {body}
    </div>
  )
}

function Mini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted">{label}</div>
      <div className={`truncate font-extrabold tabular-nums ${cls}`}>{value}</div>
    </div>
  )
}
