import { useApp } from '../ctx'
import { useStore } from '../store'
import type { Cycle, Fuel, Income } from '../lib/logic'

/** Confirmed delete flows shared by every screen. Totals recalculate automatically from the records. */
export function useActions() {
  const app = useApp()
  const store = useStore()
  const { t } = app

  async function removeIncome(i: Income) {
    const ok = await app.confirm({
      title: t('delIncomeTitle'),
      body: t('delIncomeBody', { amount: app.money(i.amount), date: app.date(i.date) }),
      confirmLabel: t('delete'),
      danger: true,
    })
    if (!ok) return false
    try {
      await store.deleteIncome(i.id)
      app.toast(t('deletedIncome'))
      return true
    } catch {
      app.toast(t('saveFailed'), 'err')
      return false
    }
  }

  async function removeFuel(f: Fuel, cycle?: Cycle) {
    const c = cycle ?? store.cycles.find((x) => x.fuel.id === f.id)
    const last = store.cycles[store.cycles.length - 1]
    const isLast = c?.fuel.id === last?.fuel.id
    const extra =
      store.cycles.length === 1 ? t('delFuelExtraOnly') : isLast ? t('delFuelExtraActive') : t('delFuelExtraMid')
    const ok = await app.confirm({
      title: t('delFuelTitle'),
      body: t('delFuelBody', { n: app.n(c?.number ?? 0, 0), count: app.n(c?.incomes.length ?? 0, 0), extra }),
      confirmLabel: t('delete'),
      danger: true,
    })
    if (!ok) return false
    try {
      await store.deleteFuel(f.id)
      app.toast(t('deletedFuel'))
      return true
    } catch {
      app.toast(t('saveFailed'), 'err')
      return false
    }
  }

  return { removeIncome, removeFuel }
}
