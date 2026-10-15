import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

/** Avisa cuando el dispositivo pierde internet (común en el salón con Wi-Fi débil). */
export function ConnectionBanner() {
  const { t } = useTranslation()
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-background">
      <WifiOff className="size-4" /> {t('shell.status.offline')}
    </div>
  )
}
