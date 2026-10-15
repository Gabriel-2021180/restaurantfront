import { DatePicker } from './DatePicker'
import { presetRange, type DateRange, type RangePreset } from '@/lib/date-range'
import { todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'

const PRESETS: { id: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: '7 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'year', label: 'Este año' },
]

interface Props {
  value: DateRange
  onChange: (r: DateRange) => void
  className?: string
}

/** Rango de fechas con atajos; las fechas son días de La Paz (YYYY-MM-DD). */
export function DateRangePicker({ value, onChange, className }: Props) {
  const today = todayISO()
  const active = PRESETS.find((p) => {
    const r = presetRange(p.id)
    return r.from === value.from && r.to === value.to
  })?.id

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div role="group" aria-label="Atajos de fecha" className="flex max-w-full gap-1 overflow-x-auto rounded-[10px] bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={active === p.id}
            onClick={() => onChange(presetRange(p.id))}
            className={cn(
              'h-8 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors',
              active === p.id && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:flex sm:w-auto">
        <DatePicker short aria-label="Desde" value={value.from} max={today} onChange={(d) => onChange({ from: d, to: value.to < d ? d : value.to })} className="h-10 sm:w-[10rem]" />
        <span className="text-muted-foreground" aria-hidden>-</span>
        <DatePicker short aria-label="Hasta" value={value.to} min={value.from} max={today} onChange={(d) => onChange({ from: value.from, to: d })} className="h-10 sm:w-[10rem]" />
      </div>
    </div>
  )
}
