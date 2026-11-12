import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, FileSpreadsheet, Moon, Smartphone, Sun, Trash2, Upload } from 'lucide-react'
import { useApp } from '../ctx'
import { useStore } from '../store'
import { Button, Card, SectionTitle, Seg } from '../components/ui'
import { download, toCsv } from '../lib/csv'
import { parseBackup } from '../lib/backup'
import { round2 } from '../lib/logic'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}

export default function Settings() {
  const app = useApp()
  const { t } = app
  const store = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [installEv, setInstallEv] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEv(e as InstallEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEv(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function backup() {
    const b = store.backup()
    download(`my-bike-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2), 'application/json')
    app.toast(t('backupDone'))
  }

  async function onFile(file: File) {
    const text = await file.text()
    const r = parseBackup(text)
    if (!r.ok) {
      app.toast(r.error === 'invalidFile' ? t('restoreInvalidFile') : r.error === 'orphanIncome' ? t('restoreOrphan') : t('restoreInvalidData'), 'err')
      return
    }
    const ok = await app.confirm({
      title: t('restoreTitle'),
      body: t('restoreBody', { fuels: app.n(r.data.fuels.length, 0), incomes: app.n(r.data.incomes.length, 0) }),
      confirmLabel: t('restoreJson'),
      danger: true,
    })
    if (!ok) return
    try {
      await store.restore(r.data)
      app.toast(t('restoreDone'))
    } catch {
      app.toast(t('saveFailed'), 'err')
    }
  }

  function exportAll() {
    const csv = toCsv(
      [t('csvCycle'), t('csvFuelDate'), t('csvFuelAmount'), t('csvDate'), t('csvIncome'), t('csvSource'), t('csvNotes'), t('csvTotalIncome'), t('csvRemaining'), t('csvStatus')],
      store.cycles.flatMap((c) => {
        const status = c.status === 'active' ? 'Active' : 'Completed'
        if (!c.incomes.length) return [[c.number, c.fuel.date, c.fuel.amount, '', '', '', '', c.totalIncome, c.remaining, status]]
        return c.incomes.map((i) => [c.number, c.fuel.date, c.fuel.amount, i.date, round2(i.amount), i.source === 'ride' ? 'Ride Sharing' : 'Other', i.notes, c.totalIncome, c.remaining, status])
      }),
    )
    download(`my-bike-tracker-all-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    app.toast(t('exported'))
  }

  async function erase() {
    const ok = await app.confirm({ title: t('eraseTitle'), body: t('eraseBody'), confirmLabel: t('eraseAll'), danger: true })
    if (!ok) return
    try {
      await store.eraseAll()
      app.toast(t('erased'))
    } catch {
      app.toast(t('saveFailed'), 'err')
    }
  }

  return (
    <div className="animate-fade">
      <h1 className="text-xl font-extrabold">{t('settings')}</h1>

      {!store.persistent && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-exp/40 bg-exp/10 p-3 text-sm text-exp">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {t('storageMemory')}
        </div>
      )}
      {store.orphans.length > 0 && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-exp/40 bg-exp/10 p-3 text-sm text-exp">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {t('orphanWarn', { n: app.n(store.orphans.length, 0) })}
        </div>
      )}

      <SectionTitle>{t('language')}</SectionTitle>
      <Seg value={app.lang} onChange={app.setLang} options={[{ value: 'en', label: 'English' }, { value: 'bn', label: 'বাংলা' }]} />

      <SectionTitle>{t('theme')}</SectionTitle>
      <Seg
        value={app.theme}
        onChange={app.setTheme}
        options={[
          { value: 'dark', label: `🌙 ${t('dark')}` },
          { value: 'light', label: `☀️ ${t('light')}` },
        ]}
      />
      <div className="sr-only"><Moon /><Sun /></div>

      <SectionTitle>{t('install')}</SectionTitle>
      <Card>
        <div className="flex gap-3">
          <Smartphone className="mt-0.5 shrink-0 text-acc" size={22} />
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-muted">{t('installHint')}</p>
            <p className="mt-1 text-xs text-muted">{t('offlineReady')}</p>
            {installed ? (
              <p className="mt-3 font-bold text-inc">✓ {t('installed')}</p>
            ) : installEv ? (
              <Button className="mt-3" onClick={() => installEv.prompt()}>{t('install')}</Button>
            ) : (
              <p className="mt-2 text-xs text-muted">{t('installIos')}</p>
            )}
          </div>
        </div>
      </Card>

      <SectionTitle>{t('data')}</SectionTitle>
      <div className="space-y-2">
        <Button variant="soft" className="w-full justify-start" onClick={backup}><Download size={18} /> {t('backupJson')}</Button>
        <Button variant="soft" className="w-full justify-start" onClick={() => fileRef.current?.click()}><Upload size={18} /> {t('restoreJson')}</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) onFile(f)
          }}
        />
        <Button variant="soft" className="w-full justify-start" onClick={exportAll} disabled={!store.cycles.length}><FileSpreadsheet size={18} /> {t('exportAllCsv')}</Button>
        <Button variant="danger" className="w-full justify-start" onClick={erase} disabled={!store.fuels.length && !store.incomes.length}><Trash2 size={18} /> {t('eraseAll')}</Button>
      </div>

      <SectionTitle>{t('about')}</SectionTitle>
      <Card>
        <p className="text-sm text-muted">{t('aboutBody')}</p>
        <p className="mt-2 text-xs text-muted">{t('incomeAfterFuelNote')}</p>
      </Card>
    </div>
  )
}
