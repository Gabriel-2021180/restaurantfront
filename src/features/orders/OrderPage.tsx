import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useSocketEvent } from '@/app/providers/SocketProvider'
import { confirm } from '@/components/feedback/confirm'
import { PageFallback } from '@/components/layout/PageFallback'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCategoriesQuery, useProductsQuery } from '@/features/menu/api'
import { useActivePromotions } from '@/features/promotions/api'
import { getErrorCode, getErrorMessage } from '@/lib/api/client'
import { formatElapsed } from '@/lib/format'
import type { ActivePromotion, Product } from '@/types/menu'
import { AddItemDialog, type AddTarget } from './AddItemDialog'
import { orderKeys, useOrder, useOrderActions, type AddItemInput } from './api'
import { MenuPanel } from './MenuPanel'
import { OrderBar } from './OrderBar'
import { TicketPanel } from './TicketPanel'
import { orderSummary, placeName } from './utils'

const CLOSED = ['pending_payment', 'billed', 'completed', 'cancelled', 'merged']

export default function OrderPage() {
  const { t } = useTranslation()
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: order, isLoading, isError } = useOrder(orderId)
  const products = useProductsQuery()
  const categories = useCategoriesQuery()
  const promotions = useActivePromotions()
  const actions = useOrderActions(orderId)
  const [adding, setAdding] = useState<Record<string, number>>({})
  const [dialog, setDialog] = useState<(AddTarget & { kind: 'product' | 'promo' }) | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [sentBatch, setSentBatch] = useState<number | null>(null)
  const sentTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(sentTimer.current), [])
  const flashSent = (batch: number) => {
    window.clearTimeout(sentTimer.current)
    setSentBatch(batch)
    sentTimer.current = window.setTimeout(() => setSentBatch(null), 1600)
  }

  const refreshOrder = useCallback(
    (p: { orderId?: string; order_id?: string }) => {
      if ((p.orderId ?? p.order_id) === orderId) void qc.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    },
    [qc, orderId],
  )
  const refreshProducts = useCallback(() => void qc.invalidateQueries({ queryKey: ['menu', 'products'] }), [qc])
  useSocketEvent('kitchen_batch_ready', refreshOrder)
  useSocketEvent('order_ready_for_waiter', refreshOrder)
  // La comanda nueva trae un id corto: se relee el pedido abierto sin comparar.
  useSocketEvent('kitchen_new_order', useCallback(() => void qc.invalidateQueries({ queryKey: orderKeys.detail(orderId) }), [qc, orderId]))
  useSocketEvent('order_moved', refreshOrder)
  useSocketEvent('product_status_changed', refreshProducts)

  const bump = (id: string, d: number) => setAdding((a) => ({ ...a, [id]: Math.max(0, (a[id] ?? 0) + d) }))

  function add(key: string, input: AddItemInput, label: string) {
    bump(key, input.quantity)
    // mutateAsync: con toques rápidos, los callbacks de mutate() solo correrían en el último.
    actions.addItem
      .mutateAsync(input)
      .then((res) => res?.warning && toast.warning(res.warning))
      .catch((err) => toast.error(getErrorMessage(err), { description: label }))
      .finally(() => bump(key, -input.quantity))
  }

  const quickAdd = (p: Product) => add(p.id, { product_id: p.id, quantity: 1 }, p.name)

  const detailedAdd = (p: Product) =>
    setDialog({ kind: 'product', id: p.id, name: p.name, price: Number(p.price), max: p.track_stock ? Math.max(0, Number(p.stock)) : null })

  const addPromotion = (p: ActivePromotion) => {
    const price = Number(p.price_preview ?? p.price ?? p.value)
    if (p.requires_code) {
      setDialog({ kind: 'promo', id: p.id, name: p.name, price, max: null, needsCode: true, subtitle: p.items.map((i) => `${i.quantity} ${i.product?.name ?? ''}`).join(' + ') })
    } else {
      add(p.id, { promotion_id: p.id, quantity: 1 }, p.name)
    }
  }

  function confirmDialog(input: { quantity: number; notes: string | null; code?: string }) {
    if (!dialog) return
    const body: AddItemInput =
      dialog.kind === 'product'
        ? { product_id: dialog.id, quantity: input.quantity, notes: input.notes }
        : input.code
          ? { code: input.code, quantity: input.quantity, notes: input.notes }
          : { promotion_id: dialog.id, quantity: input.quantity, notes: input.notes }
    add(dialog.id, body, dialog.name)
    setDialog(null)
  }

  if (isLoading) return <PageFallback />
  if (isError || !order) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="font-semibold">{t('order.notFound')}</p>
        <Button variant="outline" asChild>
          <Link to="/tables">{t('order.back')}</Link>
        </Button>
      </div>
    )
  }

  const place = placeName(order, t)
  const closed = CLOSED.includes(order.status)
  const summary = orderSummary(order)
  const backTo = order.table ? '/tables' : '/pickup'
  const waiterName = [order.waiter?.first_names, order.waiter?.last_names].filter(Boolean).join(' ')

  const send = () => {
    // Un solo envío a la vez: un doble toque no debe mandar dos comandas (la API además bloquea la orden).
    if (actions.sendToKitchen.isPending) return
    actions.sendToKitchen.mutate(undefined, {
      onSuccess: (res) => {
        setTicketOpen(false)
        const batch = res?.batch_number ?? (summary.batches[0]?.[0] ?? 0) + 1
        // En celular confirma la propia barra; en PC, donde no hay barra, un aviso.
        if (window.matchMedia('(min-width: 1024px)').matches) toast.success(t('order.sentBatch', { n: batch }), { description: place })
        else {
          navigator.vibrate?.(12)
          flashSent(batch)
        }
      },
      onError: (err) =>
        getErrorCode(err) === 'NOTHING_TO_SEND' ? toast.info(t('order.alreadySent')) : toast.error(getErrorMessage(err)),
    })
  }

  async function requestBill() {
    const ok = await confirm({
      title: t('order.billTitle', { place }),
      description: summary.pendingUnits ? t('order.billPendingText', { n: summary.pendingUnits }) : t('order.billText'),
      confirmText: t('order.billConfirm'),
    })
    if (!ok) return
    actions.requestBill.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('order.billSent'), { description: place })
        navigate(backTo)
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  async function removeLine(id: string) {
    const line = order?.details.find((d) => d.id === id)
    const name = line?.name ?? line?.product?.name ?? ''
    const isCombo = order?.details.some((d) => d.parent_detail_id === id)
    const ok = await confirm({
      title: t('order.removeTitle', { name, count: line?.quantity ?? 1 }),
      description: isCombo ? t('order.removeComboText') : t('order.removeText'),
      confirmText: t('order.remove'),
      tone: 'danger',
    })
    if (!ok) return
    actions.removeItem.mutate(id, { onError: (err) => toast.error(getErrorMessage(err)) })
  }

  async function removeCode(promotionId: string) {
    const promo = order?.promotions?.find((p) => p.id === promotionId)
    const ok = await confirm({
      title: t('order.removeCodeTitle', { code: promo?.code ?? promo?.name ?? '' }),
      description: t('order.removeCodeText'),
      confirmText: t('order.removeCode'),
      tone: 'danger',
    })
    if (!ok) return
    actions.removePromotion.mutate(promotionId, { onError: (err) => toast.error(getErrorMessage(err)) })
  }

  const applyCode = (code: string) =>
    actions.applyCode
      .mutateAsync(code)
      .then(() => {
        toast.success(t('order.codeApplied', { code }))
        return true
      })
      .catch((err) => {
        toast.error(getErrorMessage(err))
        return false
      })

  const ticket = (
    <TicketPanel
      order={order}
      busy={{ send: actions.sendToKitchen.isPending, bill: actions.requestBill.isPending, code: actions.applyCode.isPending }}
      onRemove={removeLine}
      onSend={send}
      onRequestBill={requestBill}
      onApplyCode={applyCode}
      onRemovePromotion={removeCode}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backTo} aria-label={t('order.back')}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl leading-tight font-semibold">{place}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {t('order.openedAgo', { time: formatElapsed(order.created_at) })}
            {waiterName && ` · ${t('order.waiter', { name: waiterName })}`}
          </p>
        </div>
      </header>

      {closed ? (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4" /> {t('order.closed')}
          </p>
          <div className="overflow-hidden rounded-xl border bg-card">{ticket}</div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <MenuPanel
            products={products.data ?? []}
            categories={categories.data ?? []}
            promotions={promotions.data ?? []}
            loading={products.isLoading}
            adding={adding}
            onQuickAdd={quickAdd}
            onDetailedAdd={detailedAdd}
            onAddPromotion={addPromotion}
          />
          <aside className="hidden lg:block">
            <div className="sticky top-20 flex h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-xl border bg-card">
              <h2 className="border-b px-4 py-3 font-display text-base font-semibold">{t('order.ticket')}</h2>
              <div className="min-h-0 flex-1">{ticket}</div>
            </div>
          </aside>
        </div>
      )}

      {!closed && (
        <>
          <div className="h-16 lg:hidden" aria-hidden />
          <OrderBar
            units={summary.units}
            pendingUnits={summary.pendingUnits}
            total={Number(order.total)}
            sending={actions.sendToKitchen.isPending}
            sentBatch={sentBatch}
            onOpenTicket={() => setTicketOpen(true)}
            onSend={send}
          />
          <Sheet open={ticketOpen} onOpenChange={setTicketOpen}>
            <SheetContent side="bottom" className="h-[88dvh] gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="font-display">
                  {t('order.ticket')} · {place}
                </SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1">{ticket}</div>
            </SheetContent>
          </Sheet>
        </>
      )}

      <AddItemDialog target={dialog} onClose={() => setDialog(null)} onConfirm={confirmDialog} />
    </div>
  )
}
