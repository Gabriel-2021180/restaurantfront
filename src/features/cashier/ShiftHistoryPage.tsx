import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Bot, ChevronDown, History } from 'lucide-react'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api/client'
import { presetRange, type DateRange } from '@/lib/date-range'
import { formatDate, formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CashSession } from '@/types/finance'

const who = (u: CashSession['openedBy']) => [u?.first_names, u?.last_names].filter(Boolean).join(' ') || '—'

function diffText(d: number) {
  if (Math.abs(d) < 0.005) return { label: 'Cuadró', tone: 'text-success' }
  return d > 0 ? { label: `Sobró ${formatMoney(d)}`, tone: 'text-info' } : { label: `Faltó ${formatMoney(-d)}`, tone: 'text-destructive' }
}

export default function ShiftHistoryPage() {
  const { i18n } = useTranslation()
  const [range, setRange] = useState<DateRange>(() => presetRange('week'))
  const [openId, setOpenId] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['finance', 'shifts', range],
    queryFn: async () => (await api.get<CashSession[]>('/finance/cash-register/daily-shifts', { params: range })).data,
    placeholderData: (prev) => prev,
  })

  const totals = useMemo(() => {
    const closed = data.filter((s) => s.status === 'closed')
    return {
      count: data.length,
      diff: closed.reduce((n, s) => n + Number(s.difference ?? 0), 0),
      withIssues: closed.filter((s) => Math.abs(Number(s.difference ?? 0)) >= 0.005).length,
    }
  }, [data])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Historial de cajas</h1>
          <p className="mt-1 text-muted-foreground">
            {totals.count} turno{totals.count === 1 ? '' : 's'}
            {totals.withIssues > 0 ? ` · ${totals.withIssues} con diferencia` : ' · todos cuadraron'}
          </p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <ul className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-24" />
              </li>
            ))}
          </ul>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <History className="size-8 text-muted-foreground" />
            <p className="font-semibold">No hay turnos en estas fechas</p>
            <p className="text-sm text-muted-foreground">Prueba con otro rango.</p>
          </div>
        ) : (
          <ul className="stagger-in divide-y">
            {data.map((s) => {
              const auto = s.status === 'closed' && !s.closedBy
              const d = diffText(Number(s.difference ?? 0))
              const expanded = openId === s.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : s.id)}
                    aria-expanded={expanded}
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {formatDate(s.opened_at, i18n.language)} · {formatTime(s.opened_at, i18n.language)}
                        {s.closed_at ? ` – ${formatTime(s.closed_at, i18n.language)}` : ''}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        Abrió {who(s.openedBy)}
                        {s.status === 'open' ? ' · en curso' : auto ? ' · cierre automático' : ` · cerró ${who(s.closedBy)}`}
                      </p>
                    </div>
                    {s.status === 'open' ? (
                      <span className="text-sm font-medium text-primary">Abierta</span>
                    ) : (
                      <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium tabular-nums', d.tone)}>
                        {auto && <Bot className="size-4" />}
                        {d.label}
                      </span>
                    )}
                    <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')} />
                  </button>
                  {expanded && (
                    <div className="page-enter flex flex-col gap-3 px-5 pb-5">
                      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
                        <div className="bg-card px-3.5 py-2.5">
                          <dt className="text-xs text-muted-foreground">Cambio inicial</dt>
                          <dd className="font-semibold tabular-nums">{formatMoney(s.starting_cash)}</dd>
                        </div>
                        {(s.breakdown ?? []).map((b) => (
                          <div key={b.method} className="bg-card px-3.5 py-2.5">
                            <dt className="text-xs text-muted-foreground capitalize">{b.method.toLowerCase()}</dt>
                            <dd className="font-semibold tabular-nums">{formatMoney(b.expected)}</dd>
                            {b.counted != null && <dd className={cn('text-xs', diffText(Number(b.difference ?? 0)).tone)}>{diffText(Number(b.difference ?? 0)).label}</dd>}
                          </div>
                        ))}
                      </dl>
                      {s.notes && <p className="rounded-xl bg-secondary px-4 py-3 text-sm whitespace-pre-line">{s.notes}</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
