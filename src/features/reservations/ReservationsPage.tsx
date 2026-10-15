import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  StickyNote,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorCode, getErrorMessage } from '@/lib/api/client'
import { addDaysISO, formatDayChip, formatTime, todayISO } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import type { Reservation, ReservationStatus } from '@/types/reservation'
import { useReservationActions, useReservations, useReservationsLive } from './api'
import { ReservationForm } from './ReservationForm'

type View = 'day' | 'week'

const STATUS_STYLE: Record<ReservationStatus, { dot: string; text: string; line: string }> = {
  pending: { dot: 'bg-info', text: 'text-info', line: 'bg-info' },
  seated: { dot: 'bg-warning', text: 'text-warning', line: 'bg-warning' },
  completed: { dot: 'bg-success', text: 'text-success', line: 'bg-success' },
  cancelled: { dot: 'bg-muted-foreground/50', text: 'text-muted-foreground', line: 'bg-border' },
  no_show: { dot: 'bg-destructive', text: 'text-destructive', line: 'bg-destructive' },
}

/** Lunes de la semana de una fecha 'YYYY-MM-DD'. */
function weekStart(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return addDaysISO(iso, -dow)
}

const dayOf = (r: Reservation) => todayISO(new Date(r.reserved_at))

function ReservationCard({ r, canManage, now, onEdit }: { r: Reservation; canManage: boolean; now: number; onEdit: (r: Reservation) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const actions = useReservationActions()
  const style = STATUS_STYLE[r.status]
  const pending = r.status === 'pending'
  const late = pending && now > new Date(r.reserved_at).getTime() + 10 * 60_000
  const busy = actions.seat.isPending || actions.setStatus.isPending || actions.cancel.isPending

  function seat() {
    if (!r.table) return
    actions.seat.mutate(
      { table_id: r.table.id, reservation_id: r.id },
      {
        onSuccess: (order) => {
          toast.success(t('reservationsPage.seated', { name: r.customer_name, n: r.table?.number }))
          navigate(`/orders/${order.id}`)
        },
        onError: (err) =>
          toast.error(getErrorCode(err) === 'CASH_REGISTER_CLOSED' ? t('tablesPage.cashClosed') : getErrorMessage(err)),
      },
    )
  }

  async function cancel() {
    const ok = await confirm({
      title: t('reservationsPage.cancelTitle', { name: r.customer_name }),
      description: t('reservationsPage.cancelText', { time: formatTime(r.reserved_at) }),
      confirmText: t('reservationsPage.cancel'),
      cancelText: t('reservationsPage.keep'),
      tone: 'danger',
    })
    if (!ok) return
    actions.cancel.mutate(r.id, {
      onSuccess: () => toast.success(t('reservationsPage.cancelled', { name: r.customer_name })),
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  async function noShow() {
    const ok = await confirm({
      title: t('reservationsPage.noShowTitle', { name: r.customer_name }),
      description: r.table ? t('reservationsPage.noShowText', { n: r.table.number }) : t('reservationsPage.noShowTextNoTable'),
      confirmText: t('reservationsPage.noShow'),
      tone: 'danger',
    })
    if (!ok) return
    actions.setStatus.mutate({ id: r.id, status: 'no_show' }, { onError: (err) => toast.error(getErrorMessage(err)) })
  }

  return (
    <li className={cn('relative flex gap-4 overflow-hidden rounded-xl border bg-card p-4 pl-5', !pending && r.status !== 'seated' && 'opacity-70')}>
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', style.line)} aria-hidden />
      <div className="w-14 shrink-0">
        <p className="font-display text-xl leading-none font-semibold tabular-nums">{formatTime(r.reserved_at)}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">{r.duration_min} min</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.customer_name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {t('tablesPage.people', { count: r.party_size })}
              </span>
              <span className={cn(!r.table && 'text-warning')}>{r.table ? t('order.table', { n: r.table.number }) : t('reservationsPage.noTable')}</span>
              {r.customer_phone && (
                <a href={`tel:${r.customer_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 underline-offset-2 hover:text-foreground hover:underline">
                  <Phone className="size-3.5" /> {r.customer_phone}
                </a>
              )}
            </p>
          </div>
          {canManage && pending && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="-mt-1.5 -mr-2 size-9 shrink-0" aria-label={t('reservationsPage.actions')} disabled={busy}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => onEdit(r)}>
                  <Pencil /> {t('reservationsPage.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void noShow()}>
                  <UserX /> {t('reservationsPage.noShow')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void cancel()}>
                  <X /> {t('reservationsPage.cancel')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {r.notes && (
          <p className="mt-2 flex items-start gap-1.5 text-[13px] text-muted-foreground">
            <StickyNote className="mt-0.5 size-3.5 shrink-0" /> <span className="line-clamp-2">{r.notes}</span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', late ? 'text-destructive' : style.text)}>
            <span className={cn('size-1.5 rounded-full', late ? 'bg-destructive' : style.dot)} />
            {late ? t('reservationsPage.late') : t(`reservationsPage.status.${r.status}`)}
          </span>
          {canManage && pending && (
            <Button size="sm" onClick={seat} disabled={!r.table || busy} title={!r.table ? t('reservationsPage.assignFirst') : undefined}>
              {actions.seat.isPending ? <LoaderCircle className="animate-spin" /> : <Check />} {t('reservationsPage.seat')}
            </Button>
          )}
          {r.status === 'seated' && r.seated_order_id && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/orders/${r.seated_order_id}`)}>
              {t('tablesPage.goToOrder')}
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-2.5" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-4 rounded-xl border bg-card p-4">
          <Skeleton className="h-6 w-12" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="mt-2 h-8 w-24 self-end" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ReservationsPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin', 'waiter'])
  const [params, setParams] = useSearchParams()
  const today = todayISO()

  const [view, setView] = useState<View>('day')
  const [day, setDay] = useState(params.get('date') ?? today)
  const [showClosed, setShowClosed] = useState(false)
  // "Reservar" desde una mesa llega con ?table=: el formulario abre con esa mesa ya elegida.
  const [form, setForm] = useState<{ reservation: Reservation | null; tableId?: string | null } | null>(() => {
    const table = params.get('table')
    return table && canManage ? { reservation: null, tableId: table } : null
  })

  // Limpia ?table= de la URL para que recargar no vuelva a abrir el formulario.
  useEffect(() => {
    if (!params.has('table')) return
    params.delete('table')
    setParams(params, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useReservationsLive()
  const now = useNow()
  const from = view === 'day' ? day : weekStart(day)
  const to = view === 'day' ? day : addDaysISO(from, 6)
  const list = useReservations(from, to)

  const visible = useMemo(
    () => (list.data ?? []).filter((r) => showClosed || r.status === 'pending' || r.status === 'seated'),
    [list.data, showClosed],
  )
  const hiddenCount = (list.data?.length ?? 0) - visible.length
  const byDay = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const r of visible) map.set(dayOf(r), [...(map.get(dayOf(r)) ?? []), r])
    return map
  }, [visible])

  const pendingToday = (list.data ?? []).filter((r) => r.status === 'pending' && dayOf(r) === today)
  const nextUp = pendingToday.find((r) => new Date(r.reserved_at).getTime() > now - 30 * 60_000)
  const strip = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i - 1))

  const step = (dir: 1 | -1) => setDay((d) => addDaysISO(d, dir * (view === 'day' ? 1 : 7)))
  const people = visible.filter((r) => r.status === 'pending').reduce((s, r) => s + r.party_size, 0)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold">{t('reservationsPage.title')}</h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">
            {nextUp
              ? t('reservationsPage.next', { time: formatTime(nextUp.reserved_at), name: nextUp.customer_name })
              : t('reservationsPage.noneNext')}
          </p>
        </div>
        {canManage && (
          <Button className="shrink-0" onClick={() => setForm({ reservation: null })}>
            <Plus /> <span className="max-[380px]:sr-only">{t('reservationsPage.new')}</span>
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" className="flex rounded-[10px] border bg-card p-0.5">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                'flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150',
                view === v && 'bg-secondary text-foreground',
              )}
            >
              {v === 'day' ? <CalendarClock className="size-4" /> : <CalendarDays className="size-4" />}
              {t(`reservationsPage.view.${v}`)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-9" onClick={() => step(-1)} aria-label={t('reservationsPage.prev')}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" className="h-9" onClick={() => setDay(today)} disabled={day === today}>
            {t('reservationsPage.today')}
          </Button>
          <Button variant="outline" size="icon" className="size-9" onClick={() => step(1)} aria-label={t('reservationsPage.nextDay')}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {view === 'day' && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t('reservationsPage.title')}>
          {strip.map((iso) => {
            const c = formatDayChip(iso)
            const selected = iso === day
            return (
              <button
                key={iso}
                role="tab"
                aria-selected={selected}
                onClick={() => setDay(iso)}
                className={cn(
                  'flex h-16 w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border bg-card transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.96]',
                  selected ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-secondary',
                )}
              >
                <span className={cn('text-[11px] capitalize', !selected && 'text-muted-foreground')}>{iso === today ? t('reservationsPage.todayShort') : c.weekday}</span>
                <span className="font-display text-lg leading-tight font-semibold">{c.day}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium">
          <span className="capitalize">{view === 'day'
            ? `${formatDayChip(day).weekday} ${formatDayChip(day).day} ${formatDayChip(day).month}`
            : `${formatDayChip(from).day} ${formatDayChip(from).month} – ${formatDayChip(to).day} ${formatDayChip(to).month}`}</span>
          {visible.length > 0 && <span className="font-normal text-muted-foreground"> · {t('reservationsPage.summary', { count: visible.length, people })}</span>}
        </p>
        {(hiddenCount > 0 || showClosed) && (
          <button type="button" onClick={() => setShowClosed((s) => !s)} className="cursor-pointer text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {showClosed ? t('reservationsPage.hideClosed') : t('reservationsPage.showClosed', { count: hiddenCount })}
          </button>
        )}
      </div>

      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
          <AlertTriangle className="size-8 text-warning" />
          <p className="font-semibold">{t('reservationsPage.loadError')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(list.error)}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            <RotateCcw /> {t('common.retry')}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
          <CalendarClock className="size-8 text-muted-foreground" />
          <p className="font-semibold">{view === 'day' ? t('reservationsPage.emptyDay') : t('reservationsPage.emptyWeek')}</p>
          {canManage && (
            <Button variant="outline" onClick={() => setForm({ reservation: null })}>
              <Plus /> {t('reservationsPage.new')}
            </Button>
          )}
        </div>
      ) : view === 'day' ? (
        <ul className="stagger-in flex flex-col gap-2.5">
          {visible.map((r) => (
            <ReservationCard key={r.id} r={r} canManage={canManage} now={now} onEdit={(x) => setForm({ reservation: x })} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from({ length: 7 }, (_, i) => addDaysISO(from, i))
            .filter((iso) => byDay.has(iso))
            .map((iso) => {
              const c = formatDayChip(iso)
              return (
                <section key={iso} aria-label={iso}>
                  <h2 className="mb-2 flex items-baseline gap-2 text-base font-semibold capitalize">
                    {iso === today ? t('reservationsPage.today') : c.weekday} {c.day} {c.month}
                    <span className="text-sm font-normal text-muted-foreground">{t('reservationsPage.count', { count: byDay.get(iso)!.length })}</span>
                  </h2>
                  <ul className="flex flex-col gap-2.5">
                    {byDay.get(iso)!.map((r) => (
                      <ReservationCard key={r.id} r={r} canManage={canManage} now={now} onEdit={(x) => setForm({ reservation: x })} />
                    ))}
                  </ul>
                </section>
              )
            })}
        </div>
      )}

      {canManage && <p className="text-[13px] text-muted-foreground">{t('reservationsPage.reminderHint')}</p>}

      {form && (
        <ReservationForm
          reservation={form.reservation}
          defaults={{ date: day < today ? today : day, tableId: form.tableId }}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}
