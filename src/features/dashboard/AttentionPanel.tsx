import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarX, ChevronDown, CircleCheck, Clock, FileX, Package, Scale, type LucideIcon } from 'lucide-react'
import { useLiveInterval } from '@/app/providers/SocketProvider'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api/client'
import { formatDate, formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Alerts {
  low_stock: { id: string; name: string; kind: 'supply' | 'product'; stock: number; min: number; unit: string }[]
  cash_differences: { session_id: string; closed_at: string; closed_by: string; difference: number }[]
  voided_invoices: { id: string; invoice_number: number | string; total: number; reason: string | null; annulled_by: string | null; at: string }[]
  no_show_reservations: { id: string; customer_name: string; reserved_at: string }[]
  open_orders_old: { id: string; place: string; minutes: number }[]
}

interface Group {
  key: string
  icon: LucideIcon
  title: string
  summary: string
  to: string
  tone: 'danger' | 'warning'
  items: { key: string; primary: string; secondary: string; to?: string }[]
}

/** GRAMO llega en gramos: se muestra en kg como en Insumos. */
const qty = (v: number, unit: string) => (unit === 'GRAMO' ? `${(v / 1000).toLocaleString('es-BO', { maximumFractionDigits: 2 })} kg` : `${v} ${unit === 'u' || unit === 'UNIDAD' ? 'u.' : unit}`)
const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`)

function toGroups(a: Alerts): Group[] {
  const groups: Group[] = []
  if (a.low_stock?.length) {
    const out = a.low_stock.filter((s) => s.stock <= 0).length
    groups.push({
      key: 'stock',
      icon: Package,
      title: 'Stock bajo',
      summary: out ? `${a.low_stock.length} por reponer, ${out} agotados` : `${a.low_stock.length} por reponer`,
      to: '/inventory',
      tone: out ? 'danger' : 'warning',
      items: a.low_stock.map((s) => ({ key: s.id, primary: s.name, secondary: `${s.stock <= 0 ? 'Agotado' : `Quedan ${qty(s.stock, s.unit)}`} · mínimo ${qty(s.min, s.unit)}` })),
    })
  }
  if (a.cash_differences?.length) {
    const sum = a.cash_differences.reduce((t, c) => t + Number(c.difference), 0)
    groups.push({
      key: 'cash',
      icon: Scale,
      title: 'Cajas con diferencia',
      summary: `${a.cash_differences.length} en los últimos 7 días · ${sum < 0 ? "faltante" : "sobrante"} neto ${formatMoney(Math.abs(sum))}`,
      to: '/admin/shifts',
      tone: 'danger',
      items: a.cash_differences.map((c) => ({
        key: c.session_id,
        primary: `${Number(c.difference) > 0 ? 'Sobrante' : 'Faltante'} de ${formatMoney(Math.abs(Number(c.difference)))}`,
        secondary: `${formatDate(c.closed_at)} ${formatTime(c.closed_at)} · cerró ${c.closed_by}`,
      })),
    })
  }
  if (a.voided_invoices?.length) {
    groups.push({
      key: 'void',
      icon: FileX,
      title: 'Facturas anuladas',
      summary: `${a.voided_invoices.length} en los últimos 7 días · ${formatMoney(a.voided_invoices.reduce((t, v) => t + Number(v.total), 0))}`,
      to: '/admin/invoices',
      tone: 'warning',
      items: a.voided_invoices.map((v) => ({
        key: v.id,
        primary: `Factura N° ${v.invoice_number} · ${formatMoney(v.total)}`,
        secondary: `${v.reason ?? 'Sin motivo'}${v.annulled_by ? ` · ${v.annulled_by}` : ''} · ${formatDate(v.at)}`,
      })),
    })
  }
  if (a.open_orders_old?.length) {
    groups.push({
      key: 'orders',
      icon: Clock,
      title: 'Pedidos abiertos hace mucho',
      summary: `${a.open_orders_old.length} con más de 2 horas sin cerrar`,
      to: '/tables',
      tone: 'warning',
      items: a.open_orders_old.map((o) => ({ key: o.id, primary: o.place, secondary: `Abierto hace ${hours(o.minutes)}`, to: `/orders/${o.id}` })),
    })
  }
  if (a.no_show_reservations?.length) {
    groups.push({
      key: 'noshow',
      icon: CalendarX,
      title: 'Reservas no presentadas',
      summary: `${a.no_show_reservations.length} entre ayer y hoy`,
      to: '/reservations',
      tone: 'warning',
      items: a.no_show_reservations.map((r) => ({ key: r.id, primary: r.customer_name, secondary: `${formatDate(r.reserved_at)} ${formatTime(r.reserved_at)}` })),
    })
  }
  return groups
}

function AlertGroup({ g }: { g: Group }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="py-1">
      <div className="flex items-center gap-3 py-2">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', g.tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning')}>
          <g.icon className="size-4" />
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="min-w-0 flex-1 cursor-pointer text-left">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {g.title}
            <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">{g.summary}</span>
        </button>
        <Link to={g.to} className="shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          Revisar
        </Link>
      </div>
      {open && (
        <ul className="mb-2 ml-12 flex flex-col gap-1.5 border-l pl-3">
          {g.items.slice(0, 8).map((it) => (
            <li key={it.key} className="text-[13px]">
              {it.to ? (
                <Link to={it.to} className="font-medium hover:underline">{it.primary}</Link>
              ) : (
                <span className="font-medium">{it.primary}</span>
              )}
              <span className="block text-muted-foreground">{it.secondary}</span>
            </li>
          ))}
          {g.items.length > 8 && <li className="text-[13px] text-muted-foreground">y {g.items.length - 8} más</li>}
        </ul>
      )}
    </li>
  )
}

/** Lo que el administrador debería mirar hoy, antes que las cifras. */
export function AttentionPanel() {
  const interval = useLiveInterval(60_000)
  const alerts = useQuery({
    queryKey: ['analytics', 'alerts'],
    queryFn: async () => (await api.get<Alerts>('/analytics/alerts')).data,
    refetchInterval: interval,
    retry: 1,
  })

  if (alerts.isLoading) return <Skeleton className="h-16 w-full rounded-xl" />
  // Sin permiso o con error: el panel no estorba; las cifras siguen visibles.
  if (alerts.isError || !alerts.data) return null

  const groups = toGroups(alerts.data)
  if (!groups.length) {
    return (
      <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <CircleCheck className="size-4 text-success" /> Todo en orden: no hay alertas pendientes.
      </p>
    )
  }
  return (
    <section aria-labelledby="attention-title" className="rounded-xl border bg-card px-5 py-3">
      <h2 id="attention-title" className="flex items-center gap-2 pt-1 pb-1 font-display text-[15px] font-semibold">
        <AlertTriangle className="size-4 text-warning" /> Requiere atención
      </h2>
      <ul className="divide-y">{groups.map((g) => <AlertGroup key={g.key} g={g} />)}</ul>
    </section>
  )
}
