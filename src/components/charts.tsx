import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../ctx'
import { short } from '../lib/format'

export function useColors() {
  const { theme } = useApp()
  return theme === 'dark'
    ? { inc: '#34d399', exp: '#f87171', acc: '#60a5fa', grid: '#22305a', text: '#8d9bc4', card: '#111c3a' }
    : { inc: '#059669', exp: '#dc2626', acc: '#2563eb', grid: '#dbe3f3', text: '#5a6a8c', card: '#ffffff' }
}

type Series = { key: string; name: string; color: string }

function Tip({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money: (n: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-bold">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto font-bold">{money(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/** Grouped bar chart. data rows need a `label` plus one numeric field per series. */
export function BarsChart({ data, series, height = 220, zeroLine = false }: { data: Record<string, string | number>[]; series: Series[]; height?: number; zeroLine?: boolean }) {
  const c = useColors()
  const { money } = useApp()
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid stroke={c.grid} strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: c.text, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: c.text, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={short} width={44} />
          <Tooltip cursor={{ fill: c.grid, opacity: 0.35 }} content={<Tip money={money} />} />
          {zeroLine && <ReferenceLine y={0} stroke={c.text} strokeOpacity={0.5} />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={500}>
              {zeroLine &&
                data.map((d, i) => <Cell key={i} fill={Number(d[s.key]) < 0 ? c.exp : s.color} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <span key={i.name} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  )
}
