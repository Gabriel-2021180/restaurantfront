import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Lock, Receipt } from 'lucide-react'
import { useSocketEvent } from '@/app/providers/SocketProvider'
import { PageFallback } from '@/components/layout/PageFallback'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { placeName } from '@/features/orders/utils'
import { formatElapsed, formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/order'
import { cashKeys, useCashStatus, usePaymentQueue } from './api'
import { CheckoutSheet } from './CheckoutSheet'
import { CloseRegisterDialog, OpenRegisterPanel } from './RegisterPanels'

type Tab = 'dine_in' | 'pickup'

export default function CashierPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const status = useCashStatus()
  const isOpen = Boolean(status.data)
  const queue = usePaymentQueue(isOpen)
  const [tab, setTab] = useState<Tab>('dine_in')
  const [selected, setSelected] = useState<Order | null>(null)
  const [closing, setClosing] = useState(false)

  const refreshQueue = useCallback(() => void qc.invalidateQueries({ queryKey: cashKeys.queue }), [qc])
  useSocketEvent('notification', refreshQueue)
  useSocketEvent('table_status_changed', refreshQueue)

  const groups = useMemo(() => {
    const all = queue.data ?? []
    return { dine_in: all.filter((o) => o.table_id), pickup: all.filter((o) => !o.table_id) }
  }, [queue.data])

  if (status.isLoading) return <PageFallback variant="list" />
  if (!status.data) return <OpenRegisterPanel />

  const s = status.data
  const list = groups[tab]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Caja</h1>
          <p className="mt-1 text-muted-foreground">
            Abierta a las {formatTime(s.opened_at, i18n.language)}
            {s.opened_by && ` por ${s.opened_by}`} · en caja {formatMoney(s.expected.cash)}
          </p>
        </div>
        <Button variant="outline" onClick={() => setClosing(true)}>
          <Lock /> Cerrar caja
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          { label: 'Cobrado en el turno', value: s.sales?.total ?? 0 },
          { label: 'Efectivo', value: s.sales?.cash ?? 0 },
          { label: 'QR', value: s.sales?.qr ?? 0 },
          { label: 'Tarjeta', value: s.sales?.card ?? 0 },
        ].map((k) => (
          <div key={k.label} className="bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k.label}</dt>
            <dd className="mt-0.5 font-display text-xl font-semibold tabular-nums">{formatMoney(k.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Por cobrar</h2>
          <div role="tablist" className="flex gap-1">
            {(
              [
                { id: 'dine_in', label: t('nav.tables') },
                { id: 'pickup', label: t('nav.takeaway') },
              ] as const
            ).map((tb) => (
              <button
                key={tb.id}
                role="tab"
                aria-selected={tab === tb.id}
                onClick={() => setTab(tb.id)}
                className={cn(
                  'flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary',
                  tab === tb.id && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
                )}
              >
                {tb.label}
                {groups[tb.id].length > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground">
                    {groups[tb.id].length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {queue.isLoading ? (
            <ul className="divide-y">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </li>
              ))}
            </ul>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <Receipt className="size-8 text-muted-foreground" />
              <p className="font-semibold">No hay cuentas por cobrar</p>
              <p className="max-w-xs text-sm text-muted-foreground">Cuando un mesero pida la cuenta, aparecerá aquí al instante.</p>
            </div>
          ) : (
            <ul className="stagger-in divide-y">
              {list.map((o) => {
                const units = o.details.filter((d) => !d.parent_detail_id).reduce((n, d) => n + d.quantity, 0)
                const waiter = [o.waiter?.first_names, o.waiter?.last_names].filter(Boolean).join(' ')
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(o)}
                      className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary active:bg-secondary"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{placeName(o, t)}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {units} plato{units === 1 ? '' : 's'} · hace {formatElapsed(o.created_at)}
                          {waiter && ` · ${waiter}`}
                        </p>
                      </div>
                      <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(o.total)}</span>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <CheckoutSheet order={selected} onClose={() => setSelected(null)} />
      <CloseRegisterDialog status={s} open={closing} onOpenChange={setClosing} />
    </div>
  )
}
