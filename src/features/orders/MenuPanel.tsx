import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NotebookPen, Package, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActivePromotion, Category, Product } from '@/types/menu'
import { isSoldOut } from './utils'

interface MenuPanelProps {
  products: Product[]
  categories: Category[]
  promotions: ActivePromotion[]
  loading: boolean
  /** Cantidad que se está agregando por id (feedback inmediato al tocar). */
  adding: Record<string, number>
  onQuickAdd: (p: Product) => void
  onDetailedAdd: (p: Product) => void
  onAddPromotion: (p: ActivePromotion) => void
}

type Tab = 'all' | 'promos' | string

function AddingBadge({ n }: { n?: number }) {
  if (!n) return null
  return (
    <span className="absolute -top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs shadow-sm font-semibold text-primary-foreground tabular-nums">+{n}</span>
  )
}

export function MenuPanel({ products, categories, promotions, loading, adding, onQuickAdd, onDetailedAdd, onAddPromotion }: MenuPanelProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const sellable = useMemo(() => products.filter((p) => !p.is_combo), [products])
  const bundles = useMemo(() => promotions.filter((p) => p.kind === 'bundle'), [promotions])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sellable
      .filter((p) => (tab === 'all' || tab === 'promos' ? true : (p.category_id ?? p.category?.id) === tab))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)))
  }, [sellable, tab, search])

  const showPromos = (tab === 'all' || tab === 'promos') && bundles.length > 0
  const promoList = search ? bundles.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase())) : bundles

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: t('order.all') },
    ...(bundles.length ? [{ id: 'promos', label: t('order.promos') }] : []),
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ]

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('order.search')} className="pl-9" />
      </div>

      <div role="tablist" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              'h-9 shrink-0 cursor-pointer rounded-full border border-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary',
              tab === tb.id && 'border-border bg-card text-foreground',
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {showPromos && promoList.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {promoList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAddPromotion(p)}
                  className="relative flex min-h-[104px] cursor-pointer flex-col gap-1 rounded-xl border border-primary/30 bg-primary-soft p-3.5 text-left transition-transform duration-150 active:scale-[0.97]"
                >
                  <AddingBadge n={adding[p.id]} />
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Package className="size-3.5" /> {t('order.promos')}
                    {p.requires_code && p.code && <span className="ml-auto rounded bg-card px-1.5 py-0.5 tracking-wider">{p.code}</span>}
                  </span>
                  <span className="font-semibold">{p.name}</span>
                  <span className="line-clamp-2 text-[13px] text-muted-foreground">{p.items.map((i) => `${i.quantity} ${i.product?.name ?? ''}`).join(' + ')}</span>
                  <span className="mt-auto font-display text-lg font-semibold">{formatMoney(p.price_preview ?? p.price ?? p.value)}</span>
                </button>
              ))}
            </div>
          )}

          {tab !== 'promos' && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => {
                const out = isSoldOut(p)
                const low = p.track_stock && !out && p.stock <= Math.max(p.min_stock, 3)
                return (
                  <div key={p.id} className="relative">
                    <button
                      type="button"
                      disabled={out}
                      onClick={() => onQuickAdd(p)}
                      className={cn(
                        'relative flex h-[104px] w-full cursor-pointer flex-col justify-between rounded-xl border bg-card p-3 pr-10 text-left transition-[transform,border-color] duration-150 active:scale-[0.97] hover:border-foreground/20',
                        out && 'cursor-not-allowed opacity-45 active:scale-100',
                      )}
                    >
                      <AddingBadge n={adding[p.id]} />
                      <span className="line-clamp-2 text-[15px] leading-snug font-medium">{p.name}</span>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-[17px] font-semibold">{formatMoney(p.price)}</span>
                        {out ? (
                          <span className="text-xs font-medium text-destructive">{t('order.soldOut')}</span>
                        ) : low ? (
                          <span className="text-xs font-medium text-warning">{t('order.left', { n: p.stock })}</span>
                        ) : null}
                      </span>
                    </button>
                    {!out && (
                      <button
                        type="button"
                        onClick={() => onDetailedAdd(p)}
                        aria-label={`${t('order.addWithNote')}: ${p.name}`}
                        className="absolute top-1.5 right-1.5 grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <NotebookPen className="size-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
