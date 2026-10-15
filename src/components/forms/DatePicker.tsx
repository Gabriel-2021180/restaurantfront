import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { addDaysISO, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Selectores propios de fecha y hora: reemplazan a los nativos del navegador, que se ven
 * distinto en cada equipo y no respetan el tema. Trabajan con texto plano:
 * fechas 'YYYY-MM-DD' (días de La Paz) y horas 'HH:mm'.
 */

const locale = (lang: string) => (lang.startsWith('en') ? 'en-US' : 'es-BO')
const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
const utc = (value: string) => {
  const { y, m, d } = parse(value)
  return new Date(Date.UTC(y, m - 1, d))
}

/** "mar 14 oct 2026" */
function formatLongDate(value: string, lang = 'es', short = false) {
  return utc(value)
    .toLocaleDateString(locale(lang), { timeZone: 'UTC', weekday: short ? undefined : 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
}

const fieldClass = cn(
  'flex h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-[10px] border border-input bg-background px-3 text-left text-base transition-[border-color,box-shadow] duration-150 outline-none md:text-sm',
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/25',
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50',
)

interface CalendarProps {
  value?: string
  min?: string
  max?: string
  /** Resalta un rango (para "desde/hasta"). */
  range?: { from: string; to: string }
  onSelect: (value: string) => void
}

/** Mes en grilla; las flechas del teclado mueven el día enfocado. */
export function Calendar({ value, min, max, range, onSelect }: CalendarProps) {
  const { i18n } = useTranslation()
  const today = todayISO()
  const [focus, setFocus] = useState(value ?? (min && today < min ? min : today))
  const { y, m } = parse(focus)
  const grid = useRef<HTMLDivElement>(null)

  const loc = locale(i18n.language)
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(loc, { timeZone: 'UTC', month: 'long', year: 'numeric' })
  const weekdays = useMemo(
    // 2024-01-01 fue lunes: la semana empieza en lunes, como se usa en Bolivia.
    () => Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(loc, { timeZone: 'UTC', weekday: 'narrow' })),
    [loc],
  )

  const first = iso(y, m, 1)
  const lead = (utc(first).getUTCDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, i) => addDaysISO(first, i - lead))
  const out = (d: string) => (min && d < min) || (max && d > max)

  const prevMonth = iso(y, m - 1, 1)
  const nextMonth = iso(y, m + 1, 1)
  const canPrev = !min || addDaysISO(first, -1) >= min
  const canNext = !max || nextMonth <= max

  // Mantiene el foco del teclado en el día activo cuando cambia.
  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus({ preventScroll: true })
  }, [focus])

  function onKey(e: KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = addDaysISO(focus, step)
    if (!out(next)) setFocus(next)
  }

  return (
    <div className="w-[17.5rem] select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setFocus(prevMonth)} disabled={!canPrev} aria-label="Mes anterior" className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-display text-[15px] font-semibold first-letter:uppercase" aria-live="polite">{monthLabel}</p>
        <button type="button" onClick={() => setFocus(nextMonth)} disabled={!canNext} aria-label="Mes siguiente" className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground uppercase">
        {weekdays.map((w, i) => <span key={i} className="py-1.5">{w}</span>)}
      </div>
      <div ref={grid} role="grid" onKeyDown={onKey} className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const inMonth = parse(d).m === m
          const selected = d === value || (range && (d === range.from || d === range.to))
          const between = range && d > range.from && d < range.to
          const disabled = Boolean(out(d))
          return (
            <button
              key={d}
              type="button"
              data-day={d}
              tabIndex={d === focus ? 0 : -1}
              disabled={disabled}
              aria-selected={Boolean(selected)}
              aria-label={formatLongDate(d, i18n.language)}
              onClick={() => onSelect(d)}
              className={cn(
                'relative mx-auto grid size-9 cursor-pointer place-items-center rounded-lg text-sm tabular-nums transition-[background-color,color] duration-100 outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:text-muted-foreground/35 disabled:line-through disabled:decoration-muted-foreground/25',
                !inMonth && 'text-muted-foreground/60',
                between && 'rounded-none bg-primary-soft',
                d === today && !selected && 'font-semibold text-[var(--brand)]',
                selected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
              )}
            >
              {parse(d).d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Permite dejar la fecha vacía (campos opcionales). */
  clearable?: boolean
  /** Sin día de la semana: para campos angostos como el rango "desde/hasta". */
  short?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean
}

export function DatePicker({ value, onChange, min, max, id, placeholder, disabled, clearable, short, className, ...aria }: DatePickerProps) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} disabled={disabled} className={cn(fieldClass, className)} {...aria}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('truncate', !value && 'text-muted-foreground')}>{value ? formatLongDate(value, i18n.language, short) : (placeholder ?? 'Elegir fecha')}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          value={value || undefined}
          min={min}
          max={max}
          onSelect={(d) => {
            onChange(d)
            setOpen(false)
          }}
        />
        {clearable && value && (
          <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="mt-2 h-9 w-full cursor-pointer rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            Quitar fecha
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  /** Minutos entre opciones. */
  step?: number
  /** Primera hora elegible ('HH:mm'), por ejemplo para no ofrecer horas que ya pasaron hoy. */
  min?: string
  id?: string
  disabled?: boolean
  clearable?: boolean
  placeholder?: string
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
}

export function TimePicker({ value, onChange, step = 15, min, id, disabled, clearable, placeholder, className, ...aria }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const slots = useMemo(() => {
    const out: string[] = []
    for (let t = 0; t < 24 * 60; t += step) out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`)
    if (value && !out.includes(value)) out.push(value)
    return out.sort()
  }, [step, value])

  // Al abrir, la lista arranca en la hora elegida (o la primera disponible).
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const target = list.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? list.current?.querySelector<HTMLElement>('button:not(:disabled)')
      target?.scrollIntoView({ block: 'center' })
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" id={id} disabled={disabled} className={cn(fieldClass, 'tabular-nums', className)} {...aria}>
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn(!value && 'text-muted-foreground')}>{value || placeholder || '--:--'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-36 p-1.5">
        <div ref={list} role="listbox" className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto overscroll-contain sm:grid-cols-3">
          {slots.map((s) => {
            const off = Boolean(min && s < min)
            return (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={s === value}
                disabled={off}
                onClick={() => {
                  onChange(s)
                  setOpen(false)
                }}
                className={cn(
                  'h-10 cursor-pointer rounded-lg text-sm tabular-nums transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-30',
                  s === value && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                )}
              >
                {s}
              </button>
            )
          })}
        </div>
        {clearable && value && (
          <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="mt-1 h-9 w-full cursor-pointer rounded-lg text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            Quitar hora
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
