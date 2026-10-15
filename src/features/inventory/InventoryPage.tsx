import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Beef, MoreHorizontal, PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader, Panel } from '@/components/page'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api/client'
import { formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useProductsQuery } from '@/features/menu/api'
import type { Product } from '@/types/menu'
import { displayCost, isWeight, toDisplay, useInventoryLive, useSupplies, useSupplyActions, type Supply } from './api'
import { RestockForm, SupplyForm, type RestockTarget } from './InventoryForms'

type Tab = 'raw' | 'resale'
type Level = 'ok' | 'low' | 'out'

const level = (stock: number, min: number): Level => (stock <= 0 ? 'out' : stock <= min ? 'low' : 'ok')
const LEVEL_STYLE: Record<Level, { text: string; bar: string }> = {
  ok: { text: 'text-muted-foreground', bar: 'bg-foreground/60' },
  low: { text: 'text-warning', bar: 'bg-warning' },
  out: { text: 'text-destructive', bar: 'bg-destructive' },
}
const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 })

/** Fila de inventario: nombre, nivel con barra contra el mínimo, costo y acciones. */
function StockRow({
  name,
  stock,
  min,
  unit,
  cost,
  canEdit,
  onRestock,
  onEdit,
  onDelete,
}: {
  name: string
  stock: number
  min: number
  unit: string
  cost: number
  canEdit: boolean
  onRestock: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const lv = level(stock, min)
  // La barra llega al 100% en el triple del mínimo: así "bajo" se ve a simple vista.
  const pct = Math.max(stock > 0 ? 3 : 0, Math.min(100, (stock / Math.max(min * 3, 1)) * 100))
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5">
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate font-medium">{name}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="block h-1.5 w-28 overflow-hidden rounded-full bg-secondary sm:w-40" aria-hidden>
            <span className={cn('block h-full rounded-full', LEVEL_STYLE[lv].bar)} style={{ width: `${pct}%` }} />
          </span>
          <span className={cn('text-[13px] font-medium tabular-nums', LEVEL_STYLE[lv].text)}>
            {fmt(stock)} {unit}
            {lv !== 'ok' && ` · ${lv === 'out' ? t('inventoryPage.out') : t('inventoryPage.low')}`}
          </span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="text-[12px] text-muted-foreground">{t('inventoryPage.costPer', { unit })}</p>
          <p className="text-sm font-semibold tabular-nums">{formatMoney(cost)}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={onRestock}>
              <PackagePlus /> <span className="max-sm:sr-only">{t('inventoryPage.restock.short')}</span>
            </Button>
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9" aria-label={t('inventoryPage.actions', { name })}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onEdit && (
                    <DropdownMenuItem onSelect={onEdit}>
                      <Pencil /> {t('inventoryPage.edit')}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                        <Trash2 /> {t('inventoryPage.delete')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y border-t" aria-busy="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2 w-48" />
          </div>
          <Skeleton className="h-8 w-24" />
        </li>
      ))}
    </ul>
  )
}

export default function InventoryPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  // El chef consulta; reponer, crear, editar y borrar es del admin (matriz de roles aprobada).
  const canEdit = hasRole(['admin'])
  useInventoryLive()
  const supplies = useSupplies()
  const products = useProductsQuery()
  const actions = useSupplyActions()

  const [tab, setTab] = useState<Tab>('raw')
  const [query, setQuery] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [editing, setEditing] = useState<Supply | 'new' | null>(null)
  const [restock, setRestock] = useState<RestockTarget | null>(null)

  const resale = useMemo(() => (products.data ?? []).filter((p) => p.track_stock && !p.is_combo), [products.data])
  const q = query.trim().toLowerCase()

  const raw = (supplies.data ?? []).filter((s) => (!q || s.name.toLowerCase().includes(q)) && (!onlyLow || level(s.current_stock, s.min_stock_alert) !== 'ok'))
  const resaleList = resale.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!onlyLow || level(toNumber(p.stock), toNumber(p.min_stock)) !== 'ok'))

  const lowRaw = (supplies.data ?? []).filter((s) => level(s.current_stock, s.min_stock_alert) !== 'ok').length
  const lowResale = resale.filter((p) => level(toNumber(p.stock), toNumber(p.min_stock)) !== 'ok').length
  const lowCount = lowRaw + lowResale

  async function remove(s: Supply) {
    const ok = await confirm({
      title: t('inventoryPage.deleteTitle', { name: s.name }),
      description: t('inventoryPage.deleteText'),
      confirmText: t('inventoryPage.delete'),
      tone: 'danger',
    })
    if (!ok) return
    actions.remove.mutate(s.id, {
      onSuccess: () => toast.success(t('inventoryPage.deleted', { name: s.name })),
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const active = tab === 'raw' ? supplies : products

  return (
    <Page>
      <PageHeader
        title={t('inventoryPage.title')}
        description={lowCount ? t('inventoryPage.summaryLow', { count: lowCount }) : t('inventoryPage.summaryOk')}
        actions={
          canEdit && tab === 'raw' ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> <span className="max-[380px]:sr-only">{t('inventoryPage.new')}</span>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterChips<Tab>
          label={t('inventoryPage.title')}
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'raw',
              label: t('inventoryPage.tabs.raw'),
              count: supplies.data?.length,
            },
            {
              value: 'resale',
              label: t('inventoryPage.tabs.resale'),
              count: resale.length,
            },
          ]}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <button
            type="button"
            aria-pressed={onlyLow}
            onClick={() => setOnlyLow((v) => !v)}
            className={cn(
              'flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary',
              onlyLow && 'border-warning/50 bg-warning/10 text-warning',
            )}
          >
            <AlertTriangle className="size-4" /> {t('inventoryPage.onlyLow')}
          </button>
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('inventoryPage.search')}
              aria-label={t('inventoryPage.search')}
              className="h-10 pr-9 pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground"
                aria-label={t('tablesPage.clearSearch')}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <Panel flush>
        {active.isLoading ? (
          <ListSkeleton />
        ) : active.isError ? (
          <ErrorState error={active.error} onRetry={() => void active.refetch()} />
        ) : tab === 'raw' ? (
          raw.length === 0 ? (
            <EmptyState
              icon={Beef}
              title={q || onlyLow ? t('inventoryPage.noMatch') : t('inventoryPage.emptyRaw')}
              description={!q && !onlyLow ? t('inventoryPage.emptyRawHint') : undefined}
              action={
                canEdit && !q && !onlyLow ? (
                  <Button onClick={() => setEditing('new')}>
                    <Plus /> {t('inventoryPage.new')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="stagger-in divide-y">
              {raw.map((s) => (
                <StockRow
                  key={s.id}
                  name={s.name}
                  stock={toDisplay(s, s.current_stock)}
                  min={toDisplay(s, s.min_stock_alert)}
                  unit={isWeight(s) ? 'kg' : t('inventoryPage.unitShort')}
                  cost={displayCost(s)}
                  canEdit={canEdit}
                  onRestock={() => setRestock({ kind: 'supply', item: s })}
                  onEdit={() => setEditing(s)}
                  onDelete={() => void remove(s)}
                />
              ))}
            </ul>
          )
        ) : resaleList.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title={q || onlyLow ? t('inventoryPage.noMatch') : t('inventoryPage.emptyResale')}
            description={!q && !onlyLow ? t('inventoryPage.emptyResaleHint') : undefined}
          />
        ) : (
          <ul className="stagger-in divide-y">
            {resaleList.map((p) => (
              <StockRow
                key={p.id}
                name={p.name}
                stock={toNumber(p.stock)}
                min={toNumber(p.min_stock)}
                unit={t('inventoryPage.unitShort')}
                cost={toNumber((p as Product & { purchase_price?: number }).purchase_price)}
                canEdit={canEdit}
                onRestock={() => setRestock({ kind: 'product', item: p })}
              />
            ))}
          </ul>
        )}
      </Panel>

      {editing && <SupplyForm supply={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {restock && <RestockForm target={restock} onClose={() => setRestock(null)} />}
    </Page>
  )
}
