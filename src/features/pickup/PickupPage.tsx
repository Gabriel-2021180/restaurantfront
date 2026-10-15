import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChefHat, ChevronUp, LoaderCircle, Minus, Plus, Receipt, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { useLiveInterval, useSocketEvent } from '@/app/providers/SocketProvider'
import { confirm } from '@/components/feedback/confirm'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import api, { getErrorCode, getErrorMessage } from '@/lib/api/client'
import { formatElapsed, formatMoney, toNumber } from '@/lib/format'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { useCategoriesQuery, useProductsQuery } from '@/features/menu/api'
import { AddItemDialog, type AddTarget } from '@/features/orders/AddItemDialog'
import { MenuPanel } from '@/features/orders/MenuPanel'
import { groupLines, isSent } from '@/features/orders/utils'
import type { Product } from '@/types/menu'
import type { Order } from '@/types/order'

type Tab = 'new' | 'active'
interface CartItem {
  key: string
  product_id: string
  name: string
  price: number
  quantity: number
  notes: string | null
}

const STORE = 'pickup-draft'
/** El borrador sobrevive a un recargo accidental; si el almacenamiento falla, simplemente empieza vacío. */
function loadDraft(): { name: string; phone: string; cart: CartItem[] } {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    if (d && Array.isArray(d.cart)) return { name: String(d.name ?? ''), phone: String(d.phone ?? ''), cart: d.cart }
  } catch {
    /* borrador ilegible: se descarta */
  }
  return { name: '', phone: '', cart: [] }
}

function CartPanel({
  name,
  phone,
  cart,
  sending,
  onName,
  onPhone,
  onQty,
  onSubmit,
}: {
  name: string
  phone: string
  cart: CartItem[]
  sending: boolean
  onName: (v: string) => void
  onPhone: (v: string) => void
  onQty: (key: string, delta: number) => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  return (
    <div className="flex h-full flex-col">
      <div className="grid gap-3 border-b p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pk-name">{t('pickupPage.client')}</Label>
          <Input id="pk-name" value={name} maxLength={100} autoComplete="off" onChange={(e) => onName(e.target.value)} placeholder={t('pickupPage.clientPlaceholder')} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pk-phone">{t('pickupPage.phone')}</Label>
          <Input id="pk-phone" type="tel" inputMode="tel" maxLength={20} value={phone} onChange={(e) => onPhone(e.target.value)} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('pickupPage.cartEmpty')}</p>
        ) : (
          <ul className="divide-y">
            {cart.map((i) => (
              <li key={i.key} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  {i.notes && <p className="truncate text-[12px] text-muted-foreground">{i.notes}</p>}
                  <p className="text-[12px] text-muted-foreground tabular-nums">{formatMoney(i.price * i.quantity)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onQty(i.key, -1)} aria-label={i.quantity === 1 ? t('order.remove') : t('tablesPage.form.less')}>
                    {i.quantity === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{i.quantity}</span>
                  <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onQty(i.key, 1)} aria-label={t('tablesPage.form.more')}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{t('order.total')}</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{formatMoney(total)}</span>
        </div>
        <Button size="lg" className="h-12" disabled={sending || !cart.length || !name.trim()} onClick={onSubmit}>
          {sending ? <LoaderCircle className="animate-spin" /> : <ChefHat />} {t('pickupPage.send')}
        </Button>
        {!name.trim() && cart.length > 0 && <p className="text-center text-[12px] text-muted-foreground">{t('pickupPage.nameNeeded')}</p>}
      </div>
    </div>
  )
}

/** Pedido para llevar en curso: vista previa de lo pedido y su estado en cocina. */
function ActiveCard({ order, now }: { order: Order; now: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const groups = groupLines(order.details)
  const pending = order.details.filter((d) => isSent(d) && !d.ready_at).length
  const ready = order.details.length > 0 && order.details.every((d) => !isSent(d) || d.ready_at)
  const toCash = useMutation({
    mutationFn: async () => (await api.patch(`/orders/${order.id}/close`)).data,
    onSuccess: () => {
      toast.success(t('pickupPage.sentToCash', { name: order.client_name }))
      void qc.invalidateQueries({ queryKey: ['orders', 'active-pickups'] })
      // La cola de cobro de Caja lee estos pedidos.
      void qc.invalidateQueries({ queryKey: ['orders'] })
      void qc.invalidateQueries({ queryKey: ['cash'] })
    },
    onError: (e) => {
      toast.error(getErrorMessage(e))
      // Si otro equipo ya la mandó a caja, se muestra su estado real.
      void qc.invalidateQueries({ queryKey: ['orders', 'active-pickups'] })
    },
  })
  async function sendToCash() {
    const ok = await confirm({ title: t('pickupPage.toCashTitle', { name: order.client_name }), description: t('pickupPage.toCashText', { total: formatMoney(order.total) }), confirmText: t('pickupPage.toCash') })
    if (ok) toCash.mutate()
  }
  const status = order.status === 'pending_payment' ? 'billing' : ready ? 'ready' : 'cooking'

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <span className={cn('h-[3px]', status === 'ready' ? 'bg-success' : status === 'billing' ? 'bg-warning' : 'bg-foreground/20')} aria-hidden />
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">{order.client_name}</p>
          <p className="text-[13px] text-muted-foreground">{order.client_phone || '—'} · {formatElapsed(order.created_at, now)}</p>
        </div>
        <span className={cn('shrink-0 text-[13px] font-medium', status === 'ready' ? 'text-success' : status === 'billing' ? 'text-warning' : 'text-muted-foreground')}>
          {t(`pickupPage.status.${status}`, { count: pending })}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-1 border-t px-4 py-2.5 text-sm">
        {groups.slice(0, 5).map(({ line }) => (
          <li key={line.id} className="flex gap-2">
            <span className="w-5 text-right font-semibold tabular-nums">{line.quantity}</span>
            <span className="truncate">{line.name ?? line.product?.name}</span>
          </li>
        ))}
        {groups.length > 5 && <li className="pl-7 text-[13px] text-muted-foreground">{t('tablesPage.preview.more', { n: groups.length - 5 })}</li>}
      </ul>
      <div className="flex items-center gap-2 border-t p-2">
        <span className="flex-1 pl-2 font-display text-lg font-semibold tabular-nums">{formatMoney(order.total)}</span>
        <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${order.id}`)}>{t('pickupPage.open')}</Button>
        {order.status !== 'pending_payment' && (
          <Button size="sm" onClick={() => void sendToCash()} disabled={toCash.isPending}>
            {toCash.isPending ? <LoaderCircle className="animate-spin" /> : <Receipt />} {t('pickupPage.toCash')}
          </Button>
        )}
      </div>
    </li>
  )
}

export default function PickupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasRole } = useAuth()
  const now = useNow()
  const [tab, setTab] = useState<Tab>('new')
  const [draft] = useState(loadDraft)
  const [name, setName] = useState(draft.name)
  const [phone, setPhone] = useState(draft.phone)
  const [cart, setCart] = useState<CartItem[]>(draft.cart)
  const [dialog, setDialog] = useState<AddTarget | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  const products = useProductsQuery()
  const categories = useCategoriesQuery()
  const interval = useLiveInterval()
  const active = useQuery({
    queryKey: ['orders', 'active-pickups'],
    queryFn: async () => ((await api.get<Order[]>('/orders/active-pickups')).data ?? []).filter((o) => o.status !== 'billed' && o.status !== 'completed'),
    refetchInterval: interval,
  })
  const refresh = useCallback(() => void qc.invalidateQueries({ queryKey: ['orders', 'active-pickups'] }), [qc])
  useSocketEvent('kitchen_batch_ready', refresh)
  useSocketEvent('kitchen_new_order', refresh)
  useSocketEvent('order_ready_for_waiter', refresh)
  useSocketEvent('product_status_changed', useCallback(() => void qc.invalidateQueries({ queryKey: ['menu', 'products'] }), [qc]))

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ name, phone, cart }))
    } catch {
      /* sin almacenamiento: el borrador vive solo en memoria */
    }
  }, [name, phone, cart])

  const inCart = useMemo(() => Object.fromEntries(cart.reduce((m, i) => m.set(i.product_id, (m.get(i.product_id) ?? 0) + i.quantity), new Map<string, number>())), [cart])
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const units = cart.reduce((s, i) => s + i.quantity, 0)

  function add(p: Pick<Product, 'id' | 'name' | 'price' | 'track_stock' | 'stock'>, quantity: number, notes: string | null) {
    const already = inCart[p.id] ?? 0
    if (p.track_stock && already + quantity > toNumber(p.stock)) return void toast.error(t('order.left', { n: toNumber(p.stock) }))
    setCart((c) => {
      const key = `${p.id}::${notes ?? ''}`
      const existing = c.find((i) => i.key === key)
      return existing ? c.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i)) : [...c, { key, product_id: p.id, name: p.name, price: toNumber(p.price), quantity, notes }]
    })
  }

  const create = useMutation({
    mutationFn: async () =>
      (await api.post<{ order: Order }>('/orders/pickup', { client_name: name.trim(), client_phone: phone.trim() || undefined, items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity, notes: i.notes ?? undefined })) })).data,
    onSuccess: () => {
      toast.success(t('pickupPage.created', { name: name.trim() }))
      setCart([])
      setName('')
      setPhone('')
      setCartOpen(false)
      setTab('active')
      refresh()
    },
    onError: (err) => {
      if (getErrorCode(err) === 'CASH_REGISTER_CLOSED') {
        const canCharge = hasRole(['admin', 'cashier'])
        toast.warning(t('tablesPage.cashClosed'), {
          description: canCharge ? t('tablesPage.cashClosedCharge') : t('tablesPage.cashClosedAsk'),
          action: canCharge ? { label: t('tablesPage.goToCash'), onClick: () => navigate('/cashier') } : undefined,
        })
      } else toast.error(getErrorMessage(err))
    },
  })

  const qty = (key: string, delta: number) => setCart((c) => c.flatMap((i) => (i.key !== key ? [i] : i.quantity + delta <= 0 ? [] : [{ ...i, quantity: i.quantity + delta }])))
  const cartPanel = <CartPanel name={name} phone={phone} cart={cart} sending={create.isPending} onName={setName} onPhone={setPhone} onQty={qty} onSubmit={() => create.mutate()} />

  return (
    <Page width="wide">
      <PageHeader title={t('pickupPage.title')} description={t('pickupPage.subtitle')} />
      <FilterChips<Tab>
        label={t('pickupPage.title')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'new', label: t('pickupPage.tabs.new'), count: units || undefined },
          { value: 'active', label: t('pickupPage.tabs.active'), count: active.data?.length },
        ]}
      />

      {tab === 'new' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <MenuPanel
            products={(products.data ?? []).filter((p) => !p.is_combo)}
            categories={categories.data ?? []}
            promotions={[]}
            loading={products.isLoading}
            adding={inCart}
            onQuickAdd={(p) => add(p, 1, null)}
            onDetailedAdd={(p) => setDialog({ id: p.id, name: p.name, price: toNumber(p.price), max: p.track_stock ? Math.max(0, toNumber(p.stock) - (inCart[p.id] ?? 0)) : null })}
            onAddPromotion={() => undefined}
          />
          <aside className="hidden lg:block">
            <div className="sticky top-20 flex h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-xl border bg-card">
              <h2 className="border-b px-4 py-3 font-display text-base font-semibold">{t('pickupPage.cart')}</h2>
              <div className="min-h-0 flex-1">{cartPanel}</div>
            </div>
          </aside>
          <div className="h-16 lg:hidden" aria-hidden />
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex h-14 cursor-pointer items-center gap-3 rounded-xl bg-foreground px-4 text-background shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] transition-transform active:scale-[0.98] md:bottom-4 md:left-[calc(72px+1rem)] lg:hidden"
          >
            <ShoppingBag className="size-5" />
            <span className="flex-1 text-left text-sm font-semibold">{t('pickupPage.viewCart', { count: units })}</span>
            <span className="font-display text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
            <ChevronUp className="size-5 opacity-75" />
          </button>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent side="bottom" className="h-[88dvh] gap-0 rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="border-b px-4 py-3"><SheetTitle className="font-display">{t('pickupPage.cart')}</SheetTitle></SheetHeader>
              <div className="min-h-0 flex-1">{cartPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      ) : active.isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <li key={i} className="rounded-xl border bg-card p-4"><Skeleton className="h-5 w-32" /><Skeleton className="mt-3 h-16 w-full" /></li>)}</ul>
      ) : active.isError ? (
        <div className="rounded-xl border bg-card"><ErrorState error={active.error} onRetry={() => void active.refetch()} /></div>
      ) : !active.data?.length ? (
        <div className="rounded-xl border bg-card">
          <EmptyState icon={UtensilsCrossed} title={t('pickupPage.noActive')} action={<Button variant="outline" onClick={() => setTab('new')}><Plus /> {t('pickupPage.tabs.new')}</Button>} />
        </div>
      ) : (
        <ul className="stagger-in grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.data.map((o) => <ActiveCard key={o.id} order={o} now={now} />)}
        </ul>
      )}

      <AddItemDialog
        target={dialog}
        onClose={() => setDialog(null)}
        onConfirm={({ quantity, notes }) => {
          const p = products.data?.find((x) => x.id === dialog?.id)
          if (p) add(p, quantity, notes)
          setDialog(null)
        }}
      />
    </Page>
  )
}
