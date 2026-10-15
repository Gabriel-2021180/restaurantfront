import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, Check, LayoutGrid, LoaderCircle, Plus, RotateCcw, Search, Settings2, UtensilsCrossed, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorCode, getErrorMessage } from '@/lib/api/client'
import { formatTime } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/order'
import { useActiveOrders, useOpenTable, useTableAdmin, useTablesLive, useTablesQuery, useTablesTrash, type DiningTable } from './api'
import { TableFormDialog } from './TableFormDialog'
import { OrderPreview, TableTile } from './TableTile'
import { tileState, waiterName, type TileState } from './tile-state'

type Filter = 'all' | 'free' | 'busy' | 'reserved' | 'mine' | 'trash'

function TablesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="flex min-h-[8.5rem] flex-col gap-3 rounded-xl border bg-card p-3.5">
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="mt-auto h-3.5 w-24" />
        </div>
      ))}
    </div>
  )
}

export default function TablesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const isOwner = hasRole('super-admin')
  const isAdmin = hasRole(['admin', 'super-admin'])
  const canCharge = hasRole(['admin', 'cashier'])
  const canReserve = hasRole(['admin', 'waiter'])

  useTablesLive()
  const now = useNow()
  const tables = useTablesQuery()
  const orders = useActiveOrders()
  const [manage, setManage] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const trash = useTablesTrash(isOwner && filter === 'trash')
  const openTable = useOpenTable()
  const admin = useTableAdmin()

  const [sheet, setSheet] = useState<{ table: DiningTable; mode: 'open' | 'preview' } | null>(null)
  const [editing, setEditing] = useState<DiningTable | 'new' | null>(null)

  const orderByTable = useMemo(() => {
    const map = new Map<string, Order>()
    for (const o of orders.data ?? []) if (o.table_id) map.set(o.table_id, o)
    return map
  }, [orders.data])

  const orderOf = (tb: DiningTable) => (tb.current_order_id ? (orderByTable.get(tb.id) ?? undefined) : undefined)
  const isMine = (o?: Order) => !!o && String(o.waiter_id ?? o.waiter?.id) === String(user?.id)

  const counts = useMemo(() => {
    const c: Record<TileState, number> = { free: 0, occupied: 0, ready: 0, billing: 0, reserved: 0 }
    for (const tb of tables.data ?? []) c[tileState(tb, orderByTable.get(tb.id))]++
    return c
  }, [tables.data, orderByTable])

  // Sin useMemo: el React Compiler ya memoiza este cálculo.
  const list = (() => {
    if (filter === 'trash') return trash.data ?? []
    const q = query.trim().toLowerCase()
    return (tables.data ?? []).filter((tb) => {
      if (q && !String(tb.table_number).toLowerCase().includes(q)) return false
      const st = tileState(tb, orderByTable.get(tb.id))
      if (filter === 'free') return st === 'free'
      if (filter === 'busy') return st === 'occupied' || st === 'ready' || st === 'billing'
      if (filter === 'reserved') return st === 'reserved' || !!tb.next_reservation
      if (filter === 'mine') return isMine(orderByTable.get(tb.id))
      return true
    })
  })()

  const busy = counts.occupied + counts.ready + counts.billing
  const mineCount = (orders.data ?? []).filter((o) => o.table_id && isMine(o)).length

  const filters: { value: Filter; label: string; count?: number; show: boolean }[] = [
    { value: 'all', label: t('tablesPage.filter.all'), count: tables.data?.length, show: true },
    { value: 'mine', label: t('tablesPage.filter.mine'), count: mineCount, show: hasRole('waiter') && !isAdmin },
    { value: 'free', label: t('tablesPage.filter.free'), count: counts.free, show: true },
    { value: 'busy', label: t('tablesPage.filter.busy'), count: busy, show: true },
    { value: 'reserved', label: t('tablesPage.filter.reserved'), show: true },
    { value: 'trash', label: t('tablesPage.filter.trash'), show: isOwner && manage },
  ]

  function goToOrder(tb: DiningTable) {
    const o = orderOf(tb)
    if (!tb.current_order_id) return
    if (o && !isAdmin && o.waiter_id && !isMine(o)) {
      toast.info(t('tablesPage.notYours', { name: waiterName(o) ?? t('tablesPage.anotherWaiter') }))
      return
    }
    navigate(`/orders/${tb.current_order_id}`)
  }

  function onTile(tb: DiningTable) {
    if (manage) return setEditing(tb)
    if (tb.status === 'occupied') return goToOrder(tb)
    setSheet({ table: tb, mode: 'open' })
  }

  function open(tb: DiningTable, reservationId?: string) {
    openTable.mutate(
      { table_id: tb.id, ...(reservationId ? { reservation_id: reservationId } : {}) },
      {
        onSuccess: (order) => {
          setSheet(null)
          navigate(`/orders/${order.id}`)
        },
        onError: (err) => {
          const code = getErrorCode(err)
          if (code === 'CASH_REGISTER_CLOSED') {
            toast.warning(t('tablesPage.cashClosed'), {
              description: canCharge ? t('tablesPage.cashClosedCharge') : t('tablesPage.cashClosedAsk'),
              action: canCharge ? { label: t('tablesPage.goToCash'), onClick: () => navigate('/cashier') } : undefined,
            })
          } else {
            toast.error(getErrorMessage(err, t('tablesPage.openError')))
          }
        },
      },
    )
  }

  const sheetTable = sheet ? ((tables.data ?? []).find((x) => x.id === sheet.table.id) ?? sheet.table) : null
  const sheetOrder = sheetTable ? orderOf(sheetTable) : undefined
  const next = sheetTable?.next_reservation ?? null
  const soon = next ? new Date(next.reserved_at).getTime() - now < 90 * 60_000 : false

  const summary = tables.data
    ? [t('tablesPage.summary.busy', { count: busy }), t('tablesPage.summary.free', { count: counts.free }), counts.reserved ? t('tablesPage.summary.reserved', { count: counts.reserved }) : null]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold">{manage ? t('tablesPage.manageTitle') : t('tablesPage.title')}</h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">{manage ? t('tablesPage.manageHint') : summary}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canReserve && !manage && (
            <Button variant="outline" onClick={() => navigate('/reservations')}>
              <CalendarClock /> <span className="max-sm:sr-only">{t('tablesPage.reservations')}</span>
            </Button>
          )}
          {isOwner && manage && (
            <Button onClick={() => setEditing('new')}>
              <Plus /> {t('tablesPage.newTable')}
            </Button>
          )}
          {isOwner && (
            <Button
              variant={manage ? 'secondary' : 'outline'}
              onClick={() => {
                setManage((m) => !m)
                setFilter('all')
              }}
            >
              {manage ? <Check /> : <Settings2 />} <span className="max-sm:sr-only">{manage ? t('tablesPage.done') : t('tablesPage.manage')}</span>
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label={t('tablesPage.title')} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters
            .filter((f) => f.show)
            .map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary',
                  filter === f.value && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
                )}
              >
                {f.label}
                {f.count != null && <span className="text-[12px] text-muted-foreground tabular-nums">{f.count}</span>}
              </button>
            ))}
        </div>
        {(tables.data?.length ?? 0) > 12 && filter !== 'trash' && (
          <div className="relative sm:ml-auto sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('tablesPage.search')}
              aria-label={t('tablesPage.search')}
              className="h-10 pr-9 pl-9"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground" aria-label={t('tablesPage.clearSearch')}>
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {tables.isLoading || (filter === 'trash' && trash.isLoading) ? (
        <TablesSkeleton />
      ) : tables.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
          <AlertTriangle className="size-8 text-warning" />
          <p className="font-semibold">{t('tablesPage.loadError')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{getErrorMessage(tables.error)}</p>
          <Button variant="outline" onClick={() => void tables.refetch()}>
            <RotateCcw /> {t('common.retry')}
          </Button>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
          <LayoutGrid className="size-8 text-muted-foreground" />
          <p className="font-semibold">{filter === 'trash' ? t('tablesPage.emptyTrash') : (tables.data?.length ?? 0) === 0 ? t('tablesPage.empty') : t('tablesPage.emptyFilter')}</p>
          {isOwner && (tables.data?.length ?? 0) === 0 && (
            <Button
              onClick={() => {
                setManage(true)
                setEditing('new')
              }}
            >
              <Plus /> {t('tablesPage.newTable')}
            </Button>
          )}
        </div>
      ) : (
        <div className="stagger-in grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((tb) => (
            <TableTile
              key={tb.id}
              table={tb}
              order={orderOf(tb)}
              mine={isMine(orderOf(tb))}
              manage={manage}
              trashed={filter === 'trash'}
              now={now}
              onOpen={() => onTile(tb)}
              onPreview={() => setSheet({ table: tb, mode: 'preview' })}
              onRestore={() =>
                admin.restore.mutate(tb.id, {
                  onSuccess: () => toast.success(t('tablesPage.restored', { n: tb.table_number })),
                  onError: (e) => toast.error(getErrorMessage(e)),
                })
              }
            />
          ))}
        </div>
      )}

      {sheetTable && (
        <ResponsivePanel
          open={!!sheet}
          onOpenChange={(o) => !o && !openTable.isPending && setSheet(null)}
          title={t('order.table', { n: sheetTable.table_number })}
          description={
            sheet?.mode === 'preview' || sheetTable.status === 'occupied'
              ? undefined
              : t('tablesPage.capacity', { count: sheetTable.capacity })
          }
          footer={
            sheet?.mode === 'preview' || sheetTable.status === 'occupied' ? (
              <Button size="lg" className="h-12 w-full sm:w-auto" onClick={() => goToOrder(sheetTable)}>
                <UtensilsCrossed /> {t('tablesPage.goToOrder')}
              </Button>
            ) : sheetTable.status === 'reserved' && next ? (
              <Button size="lg" className="h-12 w-full sm:w-auto" disabled={openTable.isPending} onClick={() => open(sheetTable, next.id)}>
                {openTable.isPending ? <LoaderCircle className="animate-spin" /> : <Check />} {t('tablesPage.seat', { name: next.customer_name })}
              </Button>
            ) : (
              <>
                {canReserve && (
                  <Button variant="outline" size="lg" className="h-12 w-full sm:w-auto" onClick={() => navigate(`/reservations?table=${sheetTable.id}`)}>
                    <CalendarClock /> {t('tablesPage.reserve')}
                  </Button>
                )}
                <Button size="lg" className="h-12 w-full sm:w-auto" disabled={openTable.isPending} onClick={() => open(sheetTable)}>
                  {openTable.isPending ? <LoaderCircle className="animate-spin" /> : <UtensilsCrossed />} {t('tablesPage.openTable')}
                </Button>
              </>
            )
          }
        >
          {sheetOrder ? (
            <OrderPreview order={sheetOrder} />
          ) : sheetTable.status === 'occupied' ? (
            <p className="text-sm text-muted-foreground">{t('tablesPage.preview.loading')}</p>
          ) : next ? (
            <div className={cn('rounded-lg border px-4 py-3', soon && 'border-info/40 bg-info/5')}>
              <p className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="size-4 text-info" />
                {t('tablesPage.reservationAt', { time: formatTime(next.reserved_at) })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {next.customer_name} · {t('tablesPage.people', { count: next.party_size })}
              </p>
              {sheetTable.status !== 'reserved' && soon && <p className="mt-2 text-[13px] text-muted-foreground">{t('tablesPage.reservationSoon')}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('tablesPage.openHint')}</p>
          )}
        </ResponsivePanel>
      )}

      {editing && (
        <TableFormDialog
          table={editing === 'new' ? null : editing}
          existing={tables.data ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
