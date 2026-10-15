import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HoverCard } from 'radix-ui'
import { CalendarClock, ChefHat, Eye, Pencil, RotateCcw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatElapsed, formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { groupLines, isSent } from '@/features/orders/utils'
import type { Order } from '@/types/order'
import type { DiningTable } from './api'
import { STATE_STYLE, tileState, waiterName } from './tile-state'

/** Detalle del pedido abierto: lo comparten la vista previa flotante (PC) y la hoja (celular). */
export function OrderPreview({ order, compact }: { order: Order; compact?: boolean }) {
  const { t } = useTranslation()
  const groups = groupLines(order.details)
  const shown = compact ? groups.slice(0, 6) : groups
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        {waiterName(order) && <span>{t('order.waiter', { name: waiterName(order) })}</span>}
        <span>{t('order.openedAgo', { time: formatElapsed(order.created_at) })}</span>
      </div>
      {groups.length === 0 ? (
        <p className="rounded-lg bg-secondary px-3 py-3 text-sm text-muted-foreground">{t('tablesPage.preview.empty')}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {shown.map(({ line, children }) => {
            const sent = children.length ? children.every(isSent) : isSent(line)
            const ready = (children.length ? children : [line]).every((l) => l.ready_at)
            return (
              <li key={line.id} className="flex items-baseline gap-3 px-3 py-2 text-sm">
                <span className="w-6 shrink-0 text-right font-semibold tabular-nums">{line.quantity}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{line.name ?? line.product?.name}</span>
                  {line.notes && <span className="block truncate text-[12px] text-muted-foreground">{line.notes}</span>}
                </span>
                <span className={cn('shrink-0 text-[12px]', ready ? 'text-success' : sent ? 'text-warning' : 'text-muted-foreground')}>
                  {ready ? t('order.ready') : sent ? t('order.cooking') : t('order.pending')}
                </span>
              </li>
            )
          })}
          {shown.length < groups.length && (
            <li className="px-3 py-2 text-[13px] text-muted-foreground">{t('tablesPage.preview.more', { n: groups.length - shown.length })}</li>
          )}
        </ul>
      )}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{t('order.total')}</span>
        <span className="font-display text-xl font-semibold">{formatMoney(order.total)}</span>
      </div>
    </div>
  )
}

interface TileProps {
  table: DiningTable
  order?: Order
  mine: boolean
  manage: boolean
  trashed?: boolean
  onOpen: () => void
  onPreview: () => void
  onRestore?: () => void
  /** Reloj compartido de la página: re-renderiza los minutos transcurridos. */
  now: number
}

export function TableTile({ table, order, mine, manage, trashed, now, onOpen, onPreview, onRestore }: TileProps) {
  const { t } = useTranslation()
  const state = tileState(table, order)
  const style = STATE_STYLE[state]
  const next = table.next_reservation
  const items = order ? groupLines(order.details).reduce((s, g) => s + g.line.quantity, 0) : 0

  let body: ReactNode
  if (manage && !trashed) {
    body = (
      <span className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
        <Pencil className="size-3.5" /> {t('tablesPage.edit')}
      </span>
    )
  } else if (trashed) {
    body = (
      <Button type="button" size="sm" variant="outline" className="mt-auto w-full" onClick={onRestore}>
        <RotateCcw /> {t('tablesPage.restore')}
      </Button>
    )
  } else if (state === 'reserved' && next) {
    body = (
      <p className="mt-auto text-[13px] leading-snug">
        <span className="font-semibold">{formatTime(next.reserved_at)}</span> · <span className="text-muted-foreground">{next.customer_name}</span>
        <span className="text-muted-foreground"> · {t('tablesPage.people', { count: next.party_size })}</span>
      </p>
    )
  } else if (state === 'free') {
    body = next ? (
      <p className="mt-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <CalendarClock className="size-3.5 shrink-0" /> {t('tablesPage.reservedAt', { time: formatTime(next.reserved_at) })}
      </p>
    ) : (
      <p className="mt-auto text-[13px] text-muted-foreground">{t('tablesPage.tapToOpen')}</p>
    )
  } else {
    body = (
      <div className="mt-auto flex items-end justify-between gap-2">
        <div className="min-w-0 text-[13px] leading-snug text-muted-foreground">
          <p className="truncate">{mine ? t('tablesPage.yours') : (waiterName(order) ?? '—')}</p>
          <p className="truncate">
            {order ? formatElapsed(order.created_at, now) : t('tablesPage.items', { count: items })}
          </p>
        </div>
        {order && (
          <div className="shrink-0 text-right">
            <p className="text-[12px] text-muted-foreground">{t('tablesPage.items', { count: items })}</p>
            <p className="font-display text-[17px] leading-tight font-semibold">{formatMoney(order.total)}</p>
          </div>
        )}
      </div>
    )
  }

  const label = { free: t('tablesPage.state.free'), occupied: t('tablesPage.state.occupied'), ready: t('tablesPage.state.ready'), billing: t('tablesPage.state.billing'), reserved: t('tablesPage.state.reserved') }[state]

  const tile = (
    <div
      className={cn(
        'group relative flex min-h-[8.5rem] flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,transform,box-shadow] duration-150 ease-out',
        !trashed && 'active:scale-[0.98] hover:border-foreground/20 hover:shadow-[0_6px_20px_-12px_rgb(0_0_0/0.35)]',
        mine && state !== 'free' && 'border-foreground/25',
        trashed && 'opacity-70',
      )}
    >
      <span className={cn('h-[3px] w-full shrink-0', trashed ? 'bg-border' : style.line)} aria-hidden />
      {!trashed && (
        <button
          type="button"
          data-main
          onClick={onOpen}
          className="absolute inset-0 z-0 cursor-pointer rounded-xl focus-visible:outline-offset-[-2px]"
          aria-label={`${t('order.table', { n: table.table_number })}, ${label}${order ? `, ${formatMoney(order.total)}` : ''}`}
        />
      )}
      <div className="pointer-events-none relative z-[1] flex flex-1 flex-col gap-2 p-3.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-[28px] leading-none font-semibold tracking-tight">{table.table_number}</span>
          <span className={cn('flex items-center gap-1 text-[12px] text-muted-foreground', order && !manage && 'max-md:invisible')} title={t('tablesPage.capacity', { count: table.capacity })}>
            <Users className="size-3.5" /> {table.capacity}
          </span>
        </div>
        {!trashed && (
          <span className={cn('flex items-center gap-1.5 text-[13px] font-medium', style.text)}>
            <span className={cn('size-2 rounded-full', style.dot)} />
            {label}
            {state === 'ready' && <ChefHat className="size-3.5" />}
          </span>
        )}
        <div className={cn('mt-auto flex flex-col', trashed && 'pointer-events-auto')}>{body}</div>
      </div>
      {order && !manage && (
        <button
          type="button"
          onClick={onPreview}
          className="absolute top-1 right-1 z-[2] grid size-10 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          aria-label={t('tablesPage.preview.open', { n: table.table_number })}
        >
          <Eye className="size-[18px]" />
        </button>
      )}
    </div>
  )

  if (!order || manage) return tile

  // En PC/tablet con mouse: vista previa al pasar el cursor, sin abrir nada.
  return (
    <HoverCard.Root openDelay={350} closeDelay={80}>
      <HoverCard.Trigger asChild>{tile}</HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="right"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="z-50 hidden w-80 origin-[var(--radix-hover-card-content-transform-origin)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-[0_16px_40px_-16px_rgb(0_0_0/0.35)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:block"
        >
          <p className="mb-2 font-display text-lg font-semibold">{t('order.table', { n: table.table_number })}</p>
          <OrderPreview order={order} compact />
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}
