import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`block w-full rounded-2xl border border-line bg-card p-4 text-left ${
        onClick ? 'transition active:scale-[.99] hover:border-acc/50' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

type Variant = 'primary' | 'income' | 'fuel' | 'soft' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-acc text-white hover:brightness-110',
  income: 'bg-inc text-[#04210f] hover:brightness-110',
  fuel: 'bg-exp text-white hover:brightness-110',
  soft: 'bg-card2 text-fg border border-line hover:border-acc/50',
  ghost: 'text-muted hover:text-fg hover:bg-card2',
  danger: 'bg-exp/15 text-exp border border-exp/40 hover:bg-exp/25',
}

export function Button({
  variant = 'primary', className = '', ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.97] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    />
  )
}

export function IconButton({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-card2 hover:text-fg active:scale-95 ${className}`}
    />
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', k)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[94vh] w-full max-w-xl animate-up overflow-y-auto rounded-t-3xl border border-line bg-bg p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog(p: {
  open: boolean; title: string; body?: ReactNode; confirmLabel: string; cancelLabel: string
  danger?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  if (!p.open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade bg-black/70" onClick={p.onCancel} />
      <div role="alertdialog" aria-modal="true" className="relative w-full max-w-sm animate-pop rounded-2xl border border-line bg-card p-5 shadow-2xl">
        <h3 className="text-base font-bold">{p.title}</h3>
        {p.body && <div className="mt-2 text-sm leading-relaxed text-muted">{p.body}</div>}
        <div className="mt-5 flex gap-2">
          <Button variant="soft" className="flex-1" onClick={p.onCancel}>{p.cancelLabel}</Button>
          <Button variant={p.danger ? 'fuel' : 'primary'} className="flex-1" onClick={p.onConfirm}>{p.confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export const inputCls =
  'w-full min-h-[48px] rounded-xl border border-line bg-card px-3 text-base text-fg placeholder:text-muted/60 outline-none transition focus:border-acc focus:ring-2 focus:ring-acc/30'

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-exp">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function Seg<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-card p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] flex-1 rounded-lg px-2 text-sm font-semibold transition ${
            o.value === value ? 'bg-acc text-white shadow' : 'text-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'inc' | 'exp' | 'acc' | 'muted' }) {
  const c = { inc: 'bg-inc/15 text-inc', exp: 'bg-exp/15 text-exp', acc: 'bg-acc/15 text-acc', muted: 'bg-card2 text-muted' }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${c}`}>{children}</span>
}

export function Stat({ label, value, tone = 'fg', icon, sub }: { label: string; value: string; tone?: 'inc' | 'exp' | 'acc' | 'fg'; icon?: ReactNode; sub?: string }) {
  const c = { inc: 'text-inc', exp: 'text-exp', acc: 'text-acc', fg: 'text-fg' }[tone]
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-start gap-1.5 text-xs font-semibold leading-tight text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-xl font-extrabold tabular-nums ${c}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-3 text-muted">{icon}</div>
      <div className="font-bold">{title}</div>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{children}</h2>
      {right}
    </div>
  )
}
