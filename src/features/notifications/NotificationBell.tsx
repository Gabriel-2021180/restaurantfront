import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, BellOff, CheckCheck, CircleCheck, Info, OctagonAlert, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/app/providers/AuthProvider'
import { formatPlainDate, formatTime, todayISO, addDaysISO } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import { cn, safeInternalPath } from '@/lib/utils'
import type { AppNotification } from '@/types/notification'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from './api'

const KIND: Record<AppNotification['type'], { icon: LucideIcon; tone: string }> = {
  info: { icon: Info, tone: 'text-info bg-info/10' },
  success: { icon: CircleCheck, tone: 'text-success bg-success/10' },
  warning: { icon: AlertTriangle, tone: 'text-warning bg-warning/10' },
  error: { icon: OctagonAlert, tone: 'text-destructive bg-destructive/10' },
}

/** "ahora", "hace 5 min", "hace 2 h"; más de un día, la hora. */
function ago(iso: string, now: number, lang: string) {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  if (mins < 1) return lang.startsWith('en') ? 'now' : 'ahora'
  if (mins < 60) return lang.startsWith('en') ? `${mins} min ago` : `hace ${mins} min`
  if (mins < 24 * 60) return lang.startsWith('en') ? `${Math.floor(mins / 60)} h ago` : `hace ${Math.floor(mins / 60)} h`
  return formatTime(iso, lang)
}

export function NotificationBell({ side = 'bottom' }: { side?: 'bottom' | 'right' }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const now = useNow(60_000)
  const { isAuthenticated } = useAuth()
  const { data = [] } = useNotifications(isAuthenticated)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const [open, setOpen] = useState(false)
  const [onlyUnread, setOnlyUnread] = useState(false)
  const unread = data.filter((n) => !n.is_read).length

  const go = useCallback(
    (n: AppNotification) => {
      if (!n.is_read) markRead.mutate(n.id)
      const to = safeInternalPath(n.target_url)
      if (to) {
        setOpen(false)
        navigate(to)
      }
    },
    [markRead, navigate],
  )

  // Agrupadas por día de La Paz: Hoy, Ayer y luego la fecha.
  const groups = useMemo(() => {
    const today = todayISO()
    const yesterday = addDaysISO(today, -1)
    const list = onlyUnread ? data.filter((n) => !n.is_read) : data
    const map = new Map<string, AppNotification[]>()
    for (const n of list) {
      const day = todayISO(new Date(n.created_at))
      map.set(day, [...(map.get(day) ?? []), n])
    }
    return [...map.entries()].map(([day, items]) => ({
      label: day === today ? t('shell.notifications.today') : day === yesterday ? t('shell.notifications.yesterday') : formatPlainDate(day, i18n.language),
      items,
    }))
  }, [data, onlyUnread, t, i18n.language])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-10 rounded-[10px] text-muted-foreground hover:text-foreground active:scale-[0.94]" aria-label={unread ? `${t('shell.notifications.title')}: ${t('shell.notifications.unread', { count: unread })}` : t('shell.notifications.title')}>
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align="end" sideOffset={side === 'right' ? 12 : 6} className="flex w-[min(24rem,calc(100vw-2rem))] flex-col p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 pt-3 pb-2.5">
          <p className="font-display text-[15px] font-semibold">{t('shell.notifications.title')}</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="-mr-2 h-8 text-muted-foreground" onClick={() => markAll.mutate()}>
              <CheckCheck /> {t('shell.notifications.markAll')}
            </Button>
          )}
        </div>
        <div role="tablist" aria-label={t('shell.notifications.title')} className="flex gap-1 border-b px-3 py-2">
          {[
            { v: false, label: t('shell.notifications.all') },
            { v: true, label: `${t('shell.notifications.unreadTab')}${unread ? ` (${unread})` : ''}` },
          ].map((tab) => (
            <button
              key={String(tab.v)}
              type="button"
              role="tab"
              aria-selected={onlyUnread === tab.v}
              onClick={() => setOnlyUnread(tab.v)}
              className={cn(
                'h-8 cursor-pointer rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground',
                onlyUnread === tab.v && 'bg-secondary text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <BellOff className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{onlyUnread ? t('shell.notifications.noneUnread') : t('shell.notifications.empty')}</p>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <p className="sticky top-0 z-10 bg-popover/95 px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">{g.label}</p>
                <ul className="pb-1">
                  {g.items.map((n) => {
                    const kind = KIND[n.type] ?? KIND.info
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => go(n)}
                          className="group relative flex w-full cursor-pointer gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary"
                        >
                          <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg', kind.tone, n.is_read && 'opacity-60')}>
                            <kind.icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={cn('truncate text-sm', n.is_read ? 'text-muted-foreground' : 'font-semibold')}>{n.title}</span>
                              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{ago(n.created_at, now, i18n.language)}</span>
                            </span>
                            <span className="line-clamp-2 text-[13px] text-muted-foreground">{n.message}</span>
                          </span>
                          {!n.is_read && <span className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-primary" aria-label={t('shell.notifications.unreadTab')} />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
