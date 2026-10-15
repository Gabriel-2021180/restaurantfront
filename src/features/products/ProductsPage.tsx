import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArchiveRestore, Layers, MoreHorizontal, Pause, Pencil, Play, Plus, Search, Trash2, UtensilsCrossed, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api/client'
import { formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCategoriesQuery, useProductsQuery } from '@/features/menu/api'
import { useInventoryLive } from '@/features/inventory/api'
import { useProductActions, useProductsTrash, type ProductDetail } from './api'
import { ProductEditor } from './ProductEditor'

type Status = 'available' | 'paused' | 'out'
const statusOf = (p: ProductDetail): Status => (!p.is_active ? 'paused' : p.track_stock && toNumber(p.stock) <= 0 ? 'out' : 'available')
const STATUS_STYLE: Record<Status, string> = { available: 'text-muted-foreground', paused: 'text-warning', out: 'text-destructive' }

/** Tarjeta de vista previa: foto, nombre, precio y lo que más importa al admin (margen y estado). */
function ProductCard({ p, trashed, canManage, onEdit }: { p: ProductDetail; trashed: boolean; canManage: boolean; onEdit: () => void }) {
  const { t } = useTranslation()
  const actions = useProductActions()
  const status = statusOf(p)
  const price = toNumber(p.price)
  const cost = toNumber(p.total_cost ?? (p.track_stock ? p.purchase_price : null))
  const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null

  async function toggle() {
    if (p.is_active) {
      const ok = await confirm({ title: t('productsPage.pauseTitle', { name: p.name }), description: t('productsPage.pauseText'), confirmText: t('productsPage.pause') })
      if (!ok) return
    }
    actions.toggle.mutate(p.id, {
      onSuccess: () => toast.success(p.is_active ? t('productsPage.paused', { name: p.name }) : t('productsPage.resumed', { name: p.name })),
      onError: (e) => toast.error(getErrorMessage(e)),
    })
  }

  async function remove() {
    const ok = await confirm({ title: t('productsPage.deleteTitle', { name: p.name }), description: t('productsPage.deleteText'), confirmText: t('productsPage.delete'), tone: 'danger' })
    if (!ok) return
    actions.remove.mutate(p.id, { onSuccess: () => toast.success(t('productsPage.deleted', { name: p.name })), onError: (e) => toast.error(getErrorMessage(e)) })
  }

  return (
    <li className={cn('group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-150', !trashed && 'hover:border-foreground/20 hover:shadow-[0_6px_20px_-12px_rgb(0_0_0/0.35)]')}>
      <button type="button" onClick={canManage && !trashed ? onEdit : undefined} disabled={!canManage || trashed} className="flex flex-1 cursor-pointer flex-col text-left disabled:cursor-default" aria-label={canManage && !trashed ? t('productsPage.editNamed', { name: p.name }) : p.name}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
          {p.image_url ? (
            <img src={p.image_url} alt="" loading="lazy" className={cn('size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]', status !== 'available' && 'grayscale-[60%]')} />
          ) : (
            <span className="grid size-full place-items-center font-display text-3xl font-semibold text-muted-foreground/60">{p.name.slice(0, 1).toUpperCase()}</span>
          )}
          {status !== 'available' && !trashed && (
            <span className={cn('absolute top-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[12px] font-medium backdrop-blur-sm', STATUS_STYLE[status])}>{t(`productsPage.status.${status}`)}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <p className="line-clamp-2 leading-snug font-semibold">{p.name}</p>
          {p.description && <p className="line-clamp-2 text-[13px] text-muted-foreground">{p.description}</p>}
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <span className="font-display text-lg font-semibold tabular-nums">{formatMoney(price)}</span>
            <span className="text-right text-[12px] text-muted-foreground tabular-nums">
              {p.track_stock && <span className="block">{t('productsPage.stock', { count: toNumber(p.stock) })}</span>}
              {margin != null && <span className={cn(margin < 20 && 'text-warning')}>{t('productsPage.margin', { value: margin.toFixed(0) })}</span>}
            </span>
          </div>
        </div>
      </button>
      {canManage && (
        <div className="absolute top-2 right-2">
          {trashed ? (
            <Button size="sm" variant="secondary" onClick={() => actions.restore.mutate(p.id, { onSuccess: () => toast.success(t('productsPage.restored', { name: p.name })), onError: (e) => toast.error(getErrorMessage(e)) })}>
              <ArchiveRestore /> {t('productsPage.restore')}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="size-8 bg-background/90 backdrop-blur-sm" aria-label={t('inventoryPage.actions', { name: p.name })}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={onEdit}><Pencil /> {t('inventoryPage.edit')}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void toggle()}>{p.is_active ? <><Pause /> {t('productsPage.pause')}</> : <><Play /> {t('productsPage.resume')}</>}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void remove()}><Trash2 /> {t('productsPage.delete')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </li>
  )
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin'])
  useInventoryLive()
  const products = useProductsQuery()
  const categories = useCategoriesQuery()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [trash, setTrash] = useState(false)
  const trashed = useProductsTrash(trash)
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  // Los combos ahora se arman en Promociones; aquí solo productos sueltos.
  const list = useMemo(() => {
    const source = ((trash ? trashed.data : products.data) ?? []) as ProductDetail[]
    const q = query.trim().toLowerCase()
    return source.filter((p) => !p.is_combo && (category === 'all' || p.category_id === category) && (!q || p.name.toLowerCase().includes(q)))
  }, [trash, trashed.data, products.data, category, query])
  const active = (products.data ?? []).filter((p) => !p.is_combo)
  const paused = active.filter((p) => !p.is_active).length
  const q = trash ? trashed : products

  return (
    <Page width="wide">
      <PageHeader
        title={trash ? t('productsPage.trashTitle') : t('productsPage.title')}
        description={trash ? t('productsPage.trashHint') : t('productsPage.summary', { count: active.length, paused })}
        actions={
          canManage && (
            <>
              <Button variant="outline" asChild>
                <Link to="/categories"><Layers /> <span className="max-sm:sr-only">{t('nav.categories')}</span></Link>
              </Button>
              {!trash && (
                <Button onClick={() => setEditing('new')}>
                  <Plus /> <span className="max-[380px]:sr-only">{t('productsPage.new')}</span>
                </Button>
              )}
            </>
          )
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <FilterChips
          label={t('productsPage.title')}
          value={category}
          onChange={setCategory}
          className="min-w-0 flex-1"
          options={[{ value: 'all', label: t('tablesPage.filter.all') }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
        />
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-56 lg:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('productsPage.search')} aria-label={t('productsPage.search')} className="h-10 pr-9 pl-9" />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground" aria-label={t('tablesPage.clearSearch')}>
                <X className="size-4" />
              </button>
            )}
          </div>
          {canManage && (
            <Button variant={trash ? 'secondary' : 'outline'} className="h-10" onClick={() => setTrash((v) => !v)} aria-pressed={trash}>
              <Trash2 /> <span className="max-sm:sr-only">{trash ? t('productsPage.backToMenu') : t('productsPage.trash')}</span>
            </Button>
          )}
        </div>
      </div>

      {q.isLoading ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className="overflow-hidden rounded-xl border bg-card">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="flex flex-col gap-2 p-3.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-5 w-16" /></div>
            </li>
          ))}
        </ul>
      ) : q.isError ? (
        <div className="rounded-xl border bg-card"><ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border bg-card">
          <EmptyState
            icon={UtensilsCrossed}
            title={trash ? t('productsPage.emptyTrash') : query || category !== 'all' ? t('inventoryPage.noMatch') : t('productsPage.empty')}
            action={canManage && !trash && !query && category === 'all' ? <Button onClick={() => setEditing('new')}><Plus /> {t('productsPage.new')}</Button> : undefined}
          />
        </div>
      ) : (
        <ul className="stagger-in grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} trashed={trash} canManage={canManage} onEdit={() => setEditing(p.id)} />
          ))}
        </ul>
      )}

      {editing && <ProductEditor productId={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
