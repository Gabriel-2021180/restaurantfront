import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChefHat, ChevronDown, LoaderCircle, Printer, ShoppingBag, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { useLiveInterval, useSocketEvent } from '@/app/providers/SocketProvider'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import api, { getErrorMessage } from '@/lib/api/client'
import { formatElapsed, formatTime } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { isSent } from '@/features/orders/utils'
import { KitchenTicket } from '@/features/print/KitchenTicket'
import { printTicket } from '@/features/print/print'
import type { Order, OrderLine } from '@/types/order'

type Filter = 'all' | 'dine_in' | 'pickup'

interface Ticket {
  key: string
  order: Order
  batch: number
  sentAt: string
  lines: { line: OrderLine; children: OrderLine[] }[]
}

const COLLAPSED = 6

/** Agrupa lo enviado y aún no listo en tandas: cada tanda es una comanda en la cola. */
function toTickets(orders: Order[]): Ticket[] {
  const tickets: Ticket[] = []
  for (const order of orders) {
    const pending = order.details.filter((d) => isSent(d) && !d.ready_at)
    const byBatch = new Map<number, OrderLine[]>()
    for (const d of pending) byBatch.set(d.batch_number, [...(byBatch.get(d.batch_number) ?? []), d])
    for (const [batch, lines] of byBatch) {
      const parents = lines.filter((l) => !l.parent_detail_id || !lines.some((p) => p.id === l.parent_detail_id))
      const grouped = parents.map((line) => ({ line, children: lines.filter((c) => c.parent_detail_id === line.id) }))
      const sentAt = lines.map((l) => l.printed_at ?? l.created_at).sort()[0]
      tickets.push({ key: `${order.id}-${batch}`, order, batch, sentAt, lines: grouped })
    }
  }
  return tickets.sort((a, b) => a.sentAt.localeCompare(b.sentAt))
}

/** Demora: neutral hasta 10 min, ocre hasta 20, después ciruela. */
const urgency = (mins: number) => (mins >= 20 ? 'late' : mins >= 10 ? 'slow' : 'ok')
const URGENCY = {
  ok: { line: 'bg-foreground/20', text: 'text-muted-foreground' },
  slow: { line: 'bg-warning', text: 'text-warning' },
  late: { line: 'bg-destructive', text: 'text-destructive' },
}

function TicketCard({ ticket, now, fresh }: { ticket: Ticket; now: number; fresh: boolean }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [arming, setArming] = useState(false)
  const armTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(armTimer.current), [])

  const ready = useMutation({
    mutationFn: async () => (await api.patch(`/orders/${ticket.order.id}/batches/${ticket.batch}/ready`)).data,
    onSuccess: () => {
      toast.success(t('kitchenPage.readyDone', { place: place }))
      void qc.invalidateQueries({ queryKey: ['orders', 'active'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const order = ticket.order
  const place = order.table ? t('order.table', { n: order.table.table_number }) : t('kitchenPage.pickup', { name: order.client_name ?? '' })
  const mins = Math.max(0, Math.floor((now - new Date(ticket.sentAt).getTime()) / 60_000))
  const u = URGENCY[urgency(mins)]
  const units = ticket.lines.reduce((s, g) => s + g.line.quantity, 0)
  const visible = expanded ? ticket.lines : ticket.lines.slice(0, COLLAPSED)

  function print() {
    void printTicket(
      <KitchenTicket
        data={{
          place: order.table ? t('order.table', { n: order.table.table_number }) : t('kitchenPage.pickup', { name: order.client_name ?? '' }),
          batch: ticket.batch,
          sentAt: ticket.sentAt,
          printedAt: new Date().toISOString(),
          waiter: order.waiter?.first_names?.split(' ')[0],
          lines: ticket.lines.map(({ line, children }) => ({
            key: line.id,
            qty: line.quantity,
            name: line.name ?? line.product?.name ?? '',
            notes: line.notes,
            parts: children.map((c) => ({ key: c.id, qty: c.quantity, name: c.name ?? c.product?.name ?? '' })),
          })),
        }}
      />,
    )
  }

  // Dos toques para marcar listo: rápido para la cocina y evita marcar por error.
  function onReady() {
    if (!arming) {
      setArming(true)
      armTimer.current = window.setTimeout(() => setArming(false), 3000)
      return
    }
    window.clearTimeout(armTimer.current)
    setArming(false)
    ready.mutate()
  }

  return (
    <li className={cn('flex flex-col overflow-hidden rounded-xl border bg-card transition-[box-shadow,border-color] duration-300', fresh && 'border-foreground/40 shadow-[0_0_0_3px_var(--primary-soft)]')}>
      <span className={cn('h-[3px] w-full', u.line)} aria-hidden />
      <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-display text-xl font-semibold">
            {order.table ? <Utensils className="size-4 shrink-0 text-muted-foreground" /> : <ShoppingBag className="size-4 shrink-0 text-muted-foreground" />}
            <span className="truncate">{place}</span>
          </p>
          <p className="text-[13px] text-muted-foreground">
            {t('kitchenPage.batch', { n: ticket.batch })} · {t('kitchenPage.units', { count: units })}
            {order.waiter?.first_names && ` · ${order.waiter.first_names.split(' ')[0]}`}
          </p>
        </div>
        <div className="text-right">
          <p className={cn('font-display text-lg leading-none font-semibold tabular-nums', u.text)}>{formatElapsed(ticket.sentAt, now)}</p>
          <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">{formatTime(ticket.sentAt)}</p>
        </div>
      </header>
      <ul className="flex flex-1 flex-col gap-2 border-t px-4 py-3">
        {visible.map(({ line, children }) => (
          <li key={line.id}>
            <p className="flex gap-2.5 text-[15px] leading-snug">
              <span className="w-6 shrink-0 text-right font-semibold tabular-nums">{line.quantity}</span>
              <span className="font-medium">{line.name ?? line.product?.name}</span>
            </p>
            {children.map((c) => (
              <p key={c.id} className="ml-8.5 text-[13px] text-muted-foreground">
                {c.quantity} {c.name ?? c.product?.name}
              </p>
            ))}
            {line.notes && <p className="ml-8.5 text-[13px] text-warning italic">{line.notes}</p>}
          </li>
        ))}
        {ticket.lines.length > COLLAPSED && (
          <li>
            <button type="button" onClick={() => setExpanded((v) => !v)} className="ml-8.5 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('size-3.5 transition-transform duration-200', expanded && 'rotate-180')} />
              {expanded ? t('kitchenPage.less') : t('kitchenPage.more', { count: ticket.lines.length - COLLAPSED })}
            </button>
          </li>
        )}
      </ul>
      <footer className="flex gap-2 border-t p-2">
        <Button variant="ghost" size="icon" className="size-12 shrink-0" onClick={print} aria-label={t('kitchenPage.print')}>
          <Printer />
        </Button>
        <Button className={cn('h-12 flex-1 text-[15px] transition-colors', arming && 'bg-success text-white hover:bg-success')} onClick={onReady} disabled={ready.isPending}>
          {ready.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
          {arming ? t('kitchenPage.confirmReady') : t('kitchenPage.ready')}
        </Button>
      </footer>
    </li>
  )
}

export default function KitchenPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const now = useNow(15_000)
  const [filter, setFilter] = useState<Filter>('all')
  const seen = useRef<Set<string> | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())

  const interval = useLiveInterval(20_000)
  const orders = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: async () => (await api.get<Order[]>('/orders', { params: { active: true } })).data,
    refetchInterval: interval,
  })
  const refresh = useCallback(() => void qc.invalidateQueries({ queryKey: ['orders', 'active'] }), [qc])
  useSocketEvent('kitchen_new_order', refresh)
  useSocketEvent('kitchen_batch_ready', refresh)
  useSocketEvent('order_moved', refresh)

  const tickets = useMemo(() => toTickets(orders.data ?? []), [orders.data])

  // Resalta por un momento las comandas que acaban de llegar (no las que ya estaban al abrir).
  useEffect(() => {
    if (!orders.data) return
    const keys = new Set(tickets.map((x) => x.key))
    if (seen.current) {
      const added = [...keys].filter((k) => !seen.current!.has(k))
      if (added.length) {
        setFresh((f) => new Set([...f, ...added]))
        window.setTimeout(() => setFresh((f) => new Set([...f].filter((k) => !added.includes(k)))), 8000)
      }
    }
    seen.current = keys
  }, [tickets, orders.data])

  const list = tickets.filter((x) => filter === 'all' || (filter === 'dine_in' ? x.order.table_id : !x.order.table_id))
  const oldest = tickets[0]

  return (
    <Page width="wide">
      <PageHeader
        title={t('kitchenPage.title')}
        description={
          tickets.length
            ? t('kitchenPage.summary', { count: tickets.length, time: formatElapsed(oldest.sentAt, now) })
            : t('kitchenPage.allClear')
        }
      />
      <FilterChips<Filter>
        label={t('kitchenPage.title')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('tablesPage.filter.all'), count: tickets.length },
          { value: 'dine_in', label: t('dash.channels.dineIn'), count: tickets.filter((x) => x.order.table_id).length },
          { value: 'pickup', label: t('dash.channels.pickup'), count: tickets.filter((x) => !x.order.table_id).length },
        ]}
      />
      {orders.isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="rounded-xl border bg-card p-4"><Skeleton className="h-6 w-32" /><Skeleton className="mt-4 h-24 w-full" /><Skeleton className="mt-4 h-12 w-full" /></li>)}
        </ul>
      ) : orders.isError ? (
        <div className="rounded-xl border bg-card"><ErrorState error={orders.error} onRetry={() => void orders.refetch()} /></div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border bg-card"><EmptyState icon={ChefHat} title={t('kitchenPage.empty')} description={t('kitchenPage.emptyHint')} /></div>
      ) : (
        <ul className="stagger-in grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((ticket) => <TicketCard key={ticket.key} ticket={ticket} now={now} fresh={fresh.has(ticket.key)} />)}
        </ul>
      )}
    </Page>
  )
}
