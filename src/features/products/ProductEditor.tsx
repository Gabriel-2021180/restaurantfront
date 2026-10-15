import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChefHat, ImageUp, LoaderCircle, PackageOpen, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/api/client'
import { formatMoney, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCategoriesQuery } from '@/features/menu/api'
import { isWeight, useSupplies } from '@/features/inventory/api'
import { useProductActions, useProductDetail } from './api'

const MAX_MB = 3
type Kind = 'prepared' | 'resale'
type Row = { key: number; supply_id: string; quantity: string }

// Llave estable para las filas de la receta (no depende del render).
let rowSeq = 0
const nextKey = () => ++rowSeq

/** Alta y edición de producto: datos, imagen, receta o stock, y la ganancia calculada en vivo. */
export function ProductEditor({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const detail = useProductDetail(productId)
  const categories = useCategoriesQuery()
  const supplies = useSupplies()
  const actions = useProductActions()
  const editing = Boolean(productId)
  const fileRef = useRef<HTMLInputElement>(null)


  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<Kind>('prepared')
  const [rows, setRows] = useState<Row[]>([])
  const [fixedCost, setFixedCost] = useState('')
  const [stock, setStock] = useState('')
  const [purchase, setPurchase] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(!editing)

  // Carga el producto una sola vez al abrir para editarlo.
  const d = detail.data
  if (editing && d && !loaded) {
    setLoaded(true)
    setName(d.name)
    setPrice(String(toNumber(d.price)))
    setCategoryId(d.category_id ?? d.category?.id ?? '')
    setDescription(d.description ?? '')
    setKind(d.track_stock ? 'resale' : 'prepared')
    setRows((d.recipeIngredients ?? []).map((r) => ({ key: nextKey(), supply_id: r.supply_id, quantity: String(toNumber(r.quantity)) })))
    setFixedCost(d.fixed_cost ? String(toNumber(d.fixed_cost)) : '')
    setStock(String(toNumber(d.stock)))
    setPurchase(d.purchase_price ? String(toNumber(d.purchase_price)) : '')
    setPreview(d.image_url)
  }

  useEffect(() => () => void (preview?.startsWith('blob:') && URL.revokeObjectURL(preview)), [preview])

  const supplyById = useMemo(() => new Map((supplies.data ?? []).map((s) => [s.id, s])), [supplies.data])
  const cost = useMemo(() => {
    if (kind === 'resale') return toNumber(purchase)
    const recipe = rows.reduce((sum, r) => sum + toNumber(r.quantity) * (supplyById.get(r.supply_id)?.cost_per_unit ?? 0), 0)
    return recipe + toNumber(fixedCost)
  }, [kind, purchase, rows, fixedCost, supplyById])
  const sale = toNumber(price)
  const profit = sale - cost
  const margin = sale > 0 ? (profit / sale) * 100 : 0

  function pickImage(file?: File) {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return void toast.error(t('productsPage.form.badImage'))
    if (file.size > MAX_MB * 1024 * 1024) return void toast.error(t('settings.identity.tooBig', { mb: MAX_MB }))
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (name.trim().length < 2) errs.name = t('productsPage.form.nameRequired')
    if (!(sale > 0)) errs.price = t('productsPage.form.priceRequired')
    if (!categoryId) errs.category = t('productsPage.form.categoryRequired')
    const ingredients = rows.filter((r) => r.supply_id && toNumber(r.quantity) > 0).map((r) => ({ supply_id: r.supply_id, quantity: Number(toNumber(r.quantity).toFixed(4)) }))
    if (kind === 'prepared' && rows.some((r) => r.supply_id && !(toNumber(r.quantity) > 0))) errs.recipe = t('productsPage.form.recipeQty')
    if (kind === 'resale' && (stock === '' || toNumber(stock) < 0 || !Number.isInteger(toNumber(stock)))) errs.stock = t('productsPage.form.stockRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return
    const input = {
      name,
      price: sale,
      description,
      category_id: categoryId,
      track_stock: kind === 'resale',
      stock: toNumber(stock),
      purchase_price: toNumber(purchase),
      fixed_cost: toNumber(fixedCost),
      ingredients,
      image,
    }
    const done = {
      onSuccess: () => {
        toast.success(editing ? t('productsPage.form.updated', { name: name.trim() }) : t('productsPage.form.created', { name: name.trim() }))
        onClose()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
    if (productId) actions.update.mutate({ id: productId, ...input }, done)
    else actions.create.mutate(input, done)
  }

  const saving = actions.create.isPending || actions.update.isPending
  const err = (k: string) => errors[k] && <p className="text-[13px] text-destructive">{errors[k]}</p>

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={editing ? t('productsPage.form.editTitle') : t('productsPage.new')}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>{t('reservationsPage.form.cancel')}</Button>
          <Button type="submit" form="product-form" className="h-11" disabled={saving || (editing && !loaded)}>
            {saving && <LoaderCircle className="animate-spin" />} {t('tablesPage.form.save')}
          </Button>
        </>
      }
    >
      {editing && !loaded ? (
        detail.isError ? (
          <p className="py-6 text-center text-sm text-destructive">{getErrorMessage(detail.error)}</p>
        ) : (
          <div className="flex flex-col gap-4 py-2"><Skeleton className="h-32 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>
        )
      ) : (
        <form id="product-form" onSubmit={submit} noValidate className="flex flex-col gap-6 pt-1">
          <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative grid aspect-square w-full max-w-36 cursor-pointer place-items-center overflow-hidden rounded-xl border bg-secondary transition-[border-color,transform] duration-150 ease-out hover:border-foreground/30 active:scale-[0.98]"
                aria-label={preview ? t('productsPage.form.changeImage') : t('productsPage.form.addImage')}
              >
                {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImageUp className="size-6 text-muted-foreground" />}
                <span className="absolute inset-x-0 bottom-0 bg-foreground/60 py-1 text-center text-[12px] text-background opacity-0 transition-opacity group-hover:opacity-100">
                  {preview ? t('productsPage.form.changeImage') : t('productsPage.form.addImage')}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = '' }} />
              {image && (
                <button type="button" onClick={() => { setImage(null); setPreview(d?.image_url ?? null) }} className="inline-flex cursor-pointer items-center gap-1 self-start text-[12px] text-muted-foreground hover:text-foreground">
                  <X className="size-3" /> {t('productsPage.form.undoImage')}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-name">{t('productsPage.form.name')}</Label>
                <Input id="prod-name" value={name} maxLength={150} autoFocus={!editing} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
                {err('name')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid content-start gap-2">
                  <Label htmlFor="prod-price">{t('productsPage.form.price')}</Label>
                  <MoneyInput id="prod-price" value={price} onValueChange={setPrice} aria-invalid={!!errors.price} />
                  {err('price')}
                </div>
                <div className="grid content-start gap-2">
                  <Label htmlFor="prod-cat">{t('productsPage.form.category')}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="prod-cat" className="h-11 w-full" aria-invalid={!!errors.category}>
                      <SelectValue placeholder={t('productsPage.form.categoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err('category')}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prod-desc">{t('productsPage.form.description')}</Label>
            <Textarea id="prod-desc" rows={2} maxLength={1000} className="resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('productsPage.form.descriptionPlaceholder')} />
          </div>

          <div className="grid gap-3">
            <Label id="prod-kind">{t('productsPage.form.kind')}</Label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="prod-kind">
              {(['prepared', 'resale'] as const).map((k) => {
                const Icon = k === 'prepared' ? ChefHat : PackageOpen
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-left transition-[border-color,background-color] duration-150',
                      kind === k ? 'border-foreground/40 bg-primary-soft' : 'hover:bg-secondary',
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-medium">{t(`productsPage.kind.${k}`)}</span>
                      <span className="block text-[12px] text-muted-foreground">{t(`productsPage.kind.${k}Hint`)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {kind === 'prepared' ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>{t('productsPage.form.recipe')}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRows((r) => [...r, { key: nextKey(), supply_id: '', quantity: '' }])}>
                  <Plus /> {t('productsPage.form.addSupply')}
                </Button>
              </div>
              {rows.length === 0 ? (
                <p className="rounded-lg bg-secondary px-3.5 py-3 text-[13px] text-muted-foreground">{t('productsPage.form.recipeEmpty')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {rows.map((r) => {
                    const s = supplyById.get(r.supply_id)
                    const unit = s ? (isWeight(s) ? 'g' : t('inventoryPage.unitShort')) : ''
                    return (
                      <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.5rem] items-center gap-2">
                        <Select value={r.supply_id} onValueChange={(v) => setRows((all) => all.map((x) => (x.key === r.key ? { ...x, supply_id: v } : x)))}>
                          <SelectTrigger className="h-11 w-full" aria-label={t('productsPage.form.supply')}>
                            <SelectValue placeholder={t('productsPage.form.supplyPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {(supplies.data ?? []).map((x) => (
                              <SelectItem key={x.id} value={x.id} disabled={rows.some((o) => o.key !== r.key && o.supply_id === x.id)}>{x.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <Input inputMode="decimal" value={r.quantity} onChange={(e) => setRows((all) => all.map((x) => (x.key === r.key ? { ...x, quantity: e.target.value.replace(',', '.') } : x)))} className="h-11 pr-7" aria-label={t('productsPage.form.qty')} />
                          <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-muted-foreground">{unit}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="size-10" onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} aria-label={t('productsPage.form.removeSupply')}>
                          <Trash2 />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {err('recipe')}
              <div className="grid gap-2 sm:max-w-56">
                <Label htmlFor="prod-fixed">{t('productsPage.form.fixedCost')}</Label>
                <MoneyInput id="prod-fixed" value={fixedCost} onValueChange={setFixedCost} />
                <p className="text-[12px] text-muted-foreground">{t('productsPage.form.fixedCostHint')}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid content-start gap-2">
                <Label htmlFor="prod-stock">{t('productsPage.form.stock')}</Label>
                <Input id="prod-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))} aria-invalid={!!errors.stock} />
                {err('stock')}
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="prod-purchase">{t('productsPage.form.purchase')}</Label>
                <MoneyInput id="prod-purchase" value={purchase} onValueChange={setPurchase} />
              </div>
            </div>
          )}

          <dl className="grid grid-cols-3 overflow-hidden rounded-xl border">
            {[
              { label: t('productsPage.form.cost'), value: formatMoney(cost) },
              { label: t('productsPage.form.profit'), value: formatMoney(profit), tone: profit < 0 ? 'text-destructive' : '' },
              { label: t('dash.kpi.margin'), value: `${margin.toFixed(0)}%`, tone: margin < 20 ? 'text-warning' : '' },
            ].map((x, i) => (
              <div key={x.label} className={cn('px-3.5 py-2.5', i > 0 && 'border-l')}>
                <dt className="text-[12px] text-muted-foreground">{x.label}</dt>
                <dd className={cn('font-display text-lg font-semibold tabular-nums', x.tone)}>{x.value}</dd>
              </div>
            ))}
          </dl>
        </form>
      )}
    </ResponsivePanel>
  )
}
