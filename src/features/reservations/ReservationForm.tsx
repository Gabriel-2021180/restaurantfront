import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle, Minus, Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorCode, getErrorMessage } from '@/lib/api/client'
import { addDaysISO, localTimeHM, todayISO, toLaPazISO } from '@/lib/format'
import { DatePicker, TimePicker } from '@/components/forms/DatePicker'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/use-now'
import type { Reservation } from '@/types/reservation'
import { useTablesQuery } from '@/features/tables/api'
import { useReservationActions, useReservations } from './api'

const DURATIONS = [60, 90, 120, 180]
const BLOCKING = ['pending', 'seated']

interface Props {
  reservation: Reservation | null
  defaults?: { date?: string; tableId?: string | null }
  onClose: () => void
}

/** Siguiente media hora a partir de ahora, para no proponer una hora que ya pasó. */
function nextSlot(): string {
  const [h, m] = localTimeHM(Date.now() + 30 * 60_000).split(':').map(Number)
  const mm = m < 30 ? 30 : 0
  const hh = m < 30 ? h : (h + 1) % 24
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function ReservationForm({ reservation, defaults, onClose }: Props) {
  const { t } = useTranslation()
  const actions = useReservationActions()
  const now = useNow(60_000)
  const tables = useTablesQuery()

  const [name, setName] = useState(reservation?.customer_name ?? '')
  const [phone, setPhone] = useState(reservation?.customer_phone ?? '')
  const [party, setParty] = useState(reservation?.party_size ?? 2)
  const [date, setDate] = useState(() => {
    const d = reservation ? todayISO(new Date(reservation.reserved_at)) : (defaults?.date ?? todayISO())
    return d < todayISO() ? todayISO() : d
  })
  const [time, setTime] = useState(reservation ? localTimeHM(reservation.reserved_at) : nextSlot())
  const [duration, setDuration] = useState(reservation?.duration_min ?? 90)
  const [tableId, setTableId] = useState<string | null>(reservation?.table?.id ?? defaults?.tableId ?? null)
  const [notes, setNotes] = useState(reservation?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sameDay = useReservations(date, date)
  const saving = actions.create.isPending || actions.update.isPending

  // Mesas que chocan con otra reserva activa en el horario elegido.
  const busyTables = useMemo(() => {
    const busy = new Set<string>()
    if (!time) return busy
    const start = new Date(toLaPazISO(date, time)).getTime()
    const end = start + duration * 60_000
    for (const r of sameDay.data ?? []) {
      if (r.id === reservation?.id || !r.table || !BLOCKING.includes(r.status)) continue
      const rs = new Date(r.reserved_at).getTime()
      const re = new Date(r.ends_at).getTime()
      if (rs < end && start < re) busy.add(r.table.id)
    }
    return busy
  }, [sameDay.data, date, time, duration, reservation?.id])

  function validate() {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = t('reservationsPage.form.nameRequired')
    if (phone && !/^[+\d\s-]{6,20}$/.test(phone)) e.phone = t('reservationsPage.form.phoneInvalid')
    if (!date || !time) e.when = t('reservationsPage.form.whenRequired')
    else if (new Date(toLaPazISO(date, time)).getTime() < Date.now()) e.when = t('reservationsPage.form.inPast')
    const tb = tables.data?.find((x) => x.id === tableId)
    if (tb && party > tb.capacity) e.table = t('reservationsPage.form.tooSmall', { n: tb.table_number, count: tb.capacity })
    else if (tableId && busyTables.has(tableId)) e.table = t('reservationsPage.form.tableBusy')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    const input = {
      table_id: tableId,
      customer_name: name.trim(),
      customer_phone: phone.trim() || null,
      party_size: party,
      reserved_at: toLaPazISO(date, time),
      duration_min: duration,
      notes: notes.trim() || null,
    }
    const opts = {
      onSuccess: () => {
        toast.success(reservation ? t('reservationsPage.form.updated') : t('reservationsPage.form.created', { name: input.customer_name }))
        onClose()
      },
      onError: (err: unknown) => {
        const code = getErrorCode(err)
        if (code === 'RESERVATION_CONFLICT') setErrors({ table: t('reservationsPage.form.tableBusy') })
        else if (code === 'TABLE_CAPACITY_EXCEEDED') setErrors({ table: getErrorMessage(err) })
        else if (code === 'RESERVATION_IN_PAST') setErrors({ when: t('reservationsPage.form.inPast') })
        else toast.error(getErrorMessage(err))
      },
    }
    if (reservation) actions.update.mutate({ id: reservation.id, ...input }, opts)
    else actions.create.mutate(input, opts)
  }

  const fieldError = (k: string) => errors[k] && <p className="text-[13px] text-destructive">{errors[k]}</p>

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={reservation ? t('reservationsPage.form.editTitle') : t('reservationsPage.new')}
      className="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>
            {t('reservationsPage.form.cancel')}
          </Button>
          <Button type="submit" form="reservation-form" className="h-11" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />} {reservation ? t('reservationsPage.form.save') : t('reservationsPage.form.create')}
          </Button>
        </>
      }
    >
      <form id="reservation-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-2">
            <Label htmlFor="res-name">{t('reservationsPage.form.name')}</Label>
            <Input id="res-name" value={name} maxLength={120} autoComplete="name" autoFocus={!reservation} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
            {fieldError('name')}
          </div>
          <div className="grid content-start gap-2">
            <Label htmlFor="res-phone">{t('reservationsPage.form.phone')}</Label>
            <Input id="res-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="7xxxxxxx" aria-invalid={!!errors.phone} />
            {fieldError('phone')}
          </div>
        </div>

        <div className="grid gap-2">
          <Label id="res-party">{t('reservationsPage.form.party')}</Label>
          <div className="flex items-center gap-3" role="group" aria-labelledby="res-party">
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setParty((p) => Math.max(1, p - 1))} disabled={party <= 1} aria-label={t('tablesPage.form.less')}>
              <Minus />
            </Button>
            <output className="w-10 text-center font-display text-2xl font-semibold tabular-nums" aria-live="polite">{party}</output>
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setParty((p) => Math.min(100, p + 1))} aria-label={t('tablesPage.form.more')}>
              <Plus />
            </Button>
            <span className="text-sm text-muted-foreground">{t('tablesPage.people', { count: party })}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid content-start gap-2">
            <Label htmlFor="res-date">{t('reservationsPage.form.date')}</Label>
            <DatePicker id="res-date" value={date} min={todayISO()} max={addDaysISO(todayISO(), 365)} onChange={(d) => { setDate(d); setErrors((e) => ({ ...e, when: '' })) }} aria-invalid={!!errors.when} />
          </div>
          <div className="grid content-start gap-2">
            <Label htmlFor="res-time">{t('reservationsPage.form.time')}</Label>
            <TimePicker id="res-time" step={15} min={date === todayISO() ? localTimeHM(now) : undefined} value={time} onChange={(v) => { setTime(v); setErrors((e) => ({ ...e, when: '' })) }} aria-invalid={!!errors.when} />
          </div>
          <div className="col-span-2 -mt-2">{fieldError('when')}</div>
        </div>

        <div className="grid gap-2">
          <Label id="res-duration">{t('reservationsPage.form.duration')}</Label>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="res-duration">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duration === d}
                onClick={() => setDuration(d)}
                className={cn(
                  'h-10 cursor-pointer rounded-lg border px-3.5 text-sm font-medium transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]',
                  duration === d ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {d < 60 ? `${d} min` : d % 60 ? `${Math.floor(d / 60)} h ${d % 60}` : `${d / 60} h`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label id="res-table">{t('reservationsPage.form.table')}</Label>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6" role="radiogroup" aria-labelledby="res-table">
            <button
              type="button"
              role="radio"
              aria-checked={tableId === null}
              onClick={() => setTableId(null)}
              className={cn(
                'col-span-2 flex h-14 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-medium transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]',
                tableId === null ? 'border-primary bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-secondary',
              )}
            >
              {t('reservationsPage.form.noTable')}
            </button>
            {(tables.data ?? []).map((tb) => {
              const small = party > tb.capacity
              const busy = busyTables.has(tb.id)
              const selected = tableId === tb.id
              return (
                <button
                  key={tb.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={(small || busy) && !selected}
                  onClick={() => setTableId(tb.id)}
                  title={busy ? t('reservationsPage.form.tableBusy') : small ? t('tablesPage.capacity', { count: tb.capacity }) : undefined}
                  className={cn(
                    'flex h-14 cursor-pointer flex-col items-center justify-center rounded-lg border leading-tight transition-[background-color,border-color,transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40',
                    selected ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-secondary',
                    (small || busy) && selected && 'border-destructive bg-transparent text-destructive',
                  )}
                >
                  <span className="font-display text-base font-semibold">{tb.table_number}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">{busy ? t('reservationsPage.form.busyShort') : <><Users className="size-3" aria-hidden /> {tb.capacity}</>}</span>
                </button>
              )
            })}
          </div>
          {fieldError('table')}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="res-notes">{t('reservationsPage.form.notes')}</Label>
          <Textarea id="res-notes" rows={2} maxLength={500} className="resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('reservationsPage.form.notesPlaceholder')} />
        </div>
      </form>
    </ResponsivePanel>
  )
}
