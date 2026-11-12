export type Lang = 'en' | 'bn'

const loc = (l: Lang) => (l === 'bn' ? 'bn-BD' : 'en-US')

export function num(n: number, l: Lang, max = 2) {
  return n.toLocaleString(loc(l), { maximumFractionDigits: max })
}

export function money(n: number, l: Lang) {
  return (n < 0 ? '−' : '') + '৳' + Math.abs(n).toLocaleString(loc(l), { maximumFractionDigits: 2 })
}

/** Compact axis label: 1.2k */
export function short(n: number) {
  const a = Math.abs(n)
  const s = a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(Math.round(a))
  return (n < 0 ? '-' : '') + s
}

export function dateLabel(s: string, l: Lang, withYear = true) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(l === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

export function weekdayLabel(s: string, l: Lang) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(l === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long' })
}

export function monthLabel(ym: string, l: Lang) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(l === 'bn' ? 'bn-BD' : 'en-GB', { month: 'short', year: 'numeric' })
}

const BN = '০১২৩৪৫৬৭৮৯'

/** Accepts Bangla or English digits, commas and spaces. */
export function normalizeNum(s: string) {
  return s
    .replace(/[০-৯]/g, (c) => String(BN.indexOf(c)))
    .replace(/[,\s৳]/g, '')
    .replace(/[।]/g, '.')
}

export function parseNumber(s: string): number | null {
  const n = normalizeNum(s)
  if (n === '' || !/^\d*\.?\d+$|^\d+\.$/.test(n)) return null
  const v = Number(n)
  return Number.isFinite(v) ? v : null
}
