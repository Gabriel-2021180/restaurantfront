import { useDeferredValue, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  FileText,
  FolderOpen,
  LayoutGrid,
  LoaderCircle,
  Mail,
  Package,
  Search,
  Settings,
  TicketPercent,
  UserRound,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState, ErrorState, FilterChips, Panel } from '@/components/page'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { DateRange } from '@/lib/date-range'
import { addDaysISO, formatPlainDate, formatTime, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describe, FIELD_LABEL, formatValue, useAuditActors, useAuditLog, type AuditEntity, type AuditEvent } from './api'

const ICON: Record<AuditEntity, LucideIcon> = {
  product: UtensilsCrossed,
  category: FolderOpen,
  promotion: TicketPercent,
  supply: Package,
  table: LayoutGrid,
  invoice: FileText,
  cash_register: Wallet,
  user: UserRound,
  invite: Mail,
  settings: Settings,
  reservation: CalendarClock,
}

/** Grupos de filtro: lo que un dueño busca, no las tablas de la base. */
const GROUPS: { value: string; label: string; entities: AuditEntity[] }[] = [
  { value: 'all', label: 'Todo', entities: [] },
  { value: 'menu', label: 'Menú y precios', entities: ['product', 'category', 'promotion'] },
  { value: 'stock', label: 'Inventario', entities: ['supply'] },
  { value: 'money', label: 'Caja y facturas', entities: ['cash_register', 'invoice'] },
  { value: 'people', label: 'Usuarios', entities: ['user', 'invite'] },
  { value: 'floor', label: 'Mesas y reservas', entities: ['table', 'reservation'] },
  { value: 'settings', label: 'Configuración', entities: ['settings'] },
]

/** Acciones que conviene notar de un vistazo. */
const SENSITIVE = new Set(['delete', 'void', 'ban', 'role_change', 'email_change', 'password_change'])

function ChangeList({ e }: { e: AuditEvent }) {
  if (!e.changes.length && !e.reason) return null
  return (
    <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-secondary/60 px-3 py-2.5 text-[13px]">
      {e.changes.map((c, i) => (
        <div key={i} className="grid grid-cols-[minmax(6rem,auto)_1fr] items-baseline gap-x-3 gap-y-0.5 sm:grid-cols-[9rem_1fr]">
          <span className="text-muted-foreground">{FIELD_LABEL[c.field] ?? c.field}</span>
          {c.redacted ? (
            <span className="text-muted-foreground italic">Cambiada (el valor no se guarda)</span>
          ) : (
            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
              <span className="text-muted-foreground line-through decoration-muted-foreground/40">{formatValue(c.field, c.before)}</span>
              <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-label="pasó a" />
              <span className="font-medium break-words">{formatValue(c.field, c.after)}</span>
            </span>
          )}
        </div>
      ))}
      {e.reason && (
        <div className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 sm:grid-cols-[9rem_1fr]">
          <span className="text-muted-foreground">Motivo</span>
          <span>{e.reason}</span>
        </div>
      )}
    </div>
  )
}

function EventRow({ e }: { e: AuditEvent }) {
  const [open, setOpen] = useState(false)
  const Icon = ICON[e.entity] ?? Activity
  const hasDetail = e.changes.length > 0 || Boolean(e.reason)
  const sensitive = SENSITIVE.has(e.action)
  return (
    <li className="flex gap-3 py-3">
      <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground', sensitive && 'bg-destructive/10 text-destructive')}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{e.actor.name}</span> {describe(e)}
          </p>
          <time className="shrink-0 text-[12px] text-muted-foreground tabular-nums" dateTime={e.at}>{formatTime(e.at)}</time>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {e.actor.role ? `${e.actor.role} · ` : ''}
          {e.changes.length ? `${e.changes.length} ${e.changes.length === 1 ? 'cambio' : 'cambios'}` : e.reason ? 'Con motivo' : 'Sin detalle adicional'}
        </p>
        {hasDetail && (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
              {open ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
            {open && <ChangeList e={e} />}
          </>
        )}
      </div>
    </li>
  )
}

/** Registro de actividad: quién cambió qué, cuándo y cómo quedó. */
export function AuditLog({ range }: { range: DateRange }) {
  const [group, setGroup] = useState('all')
  const [actorId, setActorId] = useState<string>('all')
  const [query, setQuery] = useState('')
  const q = useDeferredValue(query)
  const filters = useMemo(
    () => ({ range, entities: GROUPS.find((g) => g.value === group)?.entities ?? [], actorId: actorId === 'all' ? null : actorId, q }),
    [range, group, actorId, q],
  )
  const log = useAuditLog(filters)
  const actors = useAuditActors(range)

  const events = useMemo(() => log.data?.pages.flatMap((p) => p.data) ?? [], [log.data])
  const total = log.data?.pages[0]?.meta.total ?? 0

  const days = useMemo(() => {
    const today = todayISO()
    const yesterday = addDaysISO(today, -1)
    const map = new Map<string, AuditEvent[]>()
    for (const e of events) {
      const d = todayISO(new Date(e.at))
      map.set(d, [...(map.get(d) ?? []), e])
    }
    return [...map.entries()].map(([d, items]) => ({ label: d === today ? 'Hoy' : d === yesterday ? 'Ayer' : formatPlainDate(d), items }))
  }, [events])

  return (
    <Panel
      title="Registro de actividad"
      description={log.data ? `${total} ${total === 1 ? 'evento' : 'eventos'} en el periodo` : 'Quién cambió qué y cuándo'}
      action={<Activity className="size-4 text-muted-foreground" />}
    >
      <div className="flex flex-col gap-3">
        <FilterChips label="Tipo de actividad" value={group} onChange={setGroup} options={GROUPS.map((g) => ({ value: g.value, label: g.label }))} />
        <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto, persona o motivo" aria-label="Buscar en la actividad" className="h-10 pr-9 pl-9" />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground" aria-label="Limpiar búsqueda">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Select value={actorId} onValueChange={setActorId}>
            <SelectTrigger className="h-10 w-full" aria-label="Persona">
              <SelectValue placeholder="Todas las personas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las personas</SelectItem>
              {(actors.data ?? []).map((a) => (
                <SelectItem key={a.id ?? 'system'} value={a.id ?? 'system'} disabled={!a.id}>
                  {a.name} ({a.events})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {log.isLoading ? (
          <div className="flex flex-col gap-3 py-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : log.isError ? (
          <ErrorState error={log.error} onRetry={() => void log.refetch()} className="py-6" />
        ) : events.length === 0 ? (
          <EmptyState icon={Activity} title="Sin actividad con estos filtros" description="Prueba con otro tipo, persona o rango de fechas." className="py-8" />
        ) : (
          <div className={cn('transition-opacity duration-200', log.isFetching && !log.isFetchingNextPage && 'opacity-60')}>
            {days.map((d) => (
              <section key={d.label} aria-label={d.label}>
                <p className="pt-3 text-xs font-medium text-muted-foreground">{d.label}</p>
                <ol className="divide-y">{d.items.map((e) => <EventRow key={e.id} e={e} />)}</ol>
              </section>
            ))}
            {log.hasNextPage && (
              <Button variant="outline" className="mt-3 h-10 w-full" onClick={() => void log.fetchNextPage()} disabled={log.isFetchingNextPage}>
                {log.isFetchingNextPage && <LoaderCircle className="animate-spin" />} Ver más actividad
              </Button>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
