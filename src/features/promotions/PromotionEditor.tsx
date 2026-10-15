import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { LoaderCircle, Minus, Package, Percent, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCategoriesQuery, useProductsQuery } from '@/features/menu/api'
import { getErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PricingType, Promotion, PromotionKind } from '@/types/menu'
import { useSavePromotion, type PromotionInput } from './api'
import { DAY_LABELS } from './format'
import { DatePicker, TimePicker } from '@/components/forms/DatePicker'

interface FormState {
  kind: PromotionKind
  name: string
  description: string
  items: Record<string, number>
  targetProducts: string[]
  targetCategories: string[]
  pricing_type: PricingType
  value: string
  start_date: string
  end_date: string
  days: number[]
  start_time: string
  end_time: string
  withCode: boolean
  code: string
  max_uses: string
  is_active: boolean
}

const fromPromotion = (p?: Promotion | null): FormState => ({
  kind: p?.kind ?? 'bundle',
  name: p?.name ?? '',
  description: p?.description ?? '',
  items: Object.fromEntries((p?.items ?? []).map((i) => [i.product_id, i.quantity])),
  targetProducts: (p?.targets ?? []).filter((t) => t.product_id).map((t) => t.product_id!),
  targetCategories: (p?.targets ?? []).filter((t) => t.category_id).map((t) => t.category_id!),
  pricing_type: p?.pricing_type ?? 'fixed_price',
  value: p?.value != null && p.pricing_type !== 'two_for_one' ? String(p.value) : '',
  start_date: p?.start_date?.slice(0, 10) ?? '',
  end_date: p?.end_date?.slice(0, 10) ?? '',
  days: p?.days_of_week ?? [],
  start_time: p?.start_time ?? '',
  end_time: p?.end_time ?? '',
  withCode: Boolean(p?.code),
  code: p?.code ?? '',
  max_uses: p?.max_uses != null ? String(p.max_uses) : '',
  is_active: p?.is_active ?? true,
})

/** Una sola forma de cobrar por promoción; cada una pide un solo dato. */
const PRICING: Record<PromotionKind, { value: PricingType; label: string; hint: string; field?: string; unit?: 'Bs' | '%' }[]> = {
  bundle: [
    { value: 'fixed_price', label: 'Precio del combo', hint: 'El combo cuesta un monto fijo.', field: 'Precio del combo', unit: 'Bs' },
    { value: 'percent_off', label: 'Descuento en %', hint: 'Se rebaja un porcentaje del precio normal.', field: 'Porcentaje de descuento', unit: '%' },
    { value: 'amount_off', label: 'Descuento en Bs', hint: 'Se rebaja un monto del precio normal.', field: 'Monto que se descuenta', unit: 'Bs' },
  ],
  discount: [
    { value: 'percent_off', label: 'Descuento en %', hint: 'Se rebaja un porcentaje del precio de cada producto.', field: 'Porcentaje de descuento', unit: '%' },
    { value: 'amount_off', label: 'Descuento en Bs', hint: 'Se rebaja un monto del precio de cada producto.', field: 'Monto que se descuenta', unit: 'Bs' },
    { value: 'two_for_one', label: '2x1', hint: 'Por cada dos unidades iguales, se cobra una.' },
  ],
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function PromotionEditor({ open, onOpenChange, promotion }: { open: boolean; onOpenChange: (o: boolean) => void; promotion: Promotion | null }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
        {open && <EditorBody key={promotion?.id ?? 'new'} promotion={promotion} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function EditorBody({ promotion, onDone }: { promotion: Promotion | null; onDone: () => void }) {
  const isEdit = Boolean(promotion)
  const [f, setF] = useState<FormState>(() => fromPromotion(promotion))
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: products = [] } = useProductsQuery()
  const { data: categories = [] } = useCategoriesQuery()
  const save = useSavePromotion()
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }))

  const sellable = useMemo(() => products.filter((p) => !p.is_combo), [products])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? sellable.filter((p) => p.name.toLowerCase().includes(q)) : sellable
  }, [sellable, search])

  const basePrice = useMemo(
    () => Object.entries(f.items).reduce((s, [id, q]) => s + (sellable.find((p) => p.id === id)?.price ?? 0) * q, 0),
    [f.items, sellable],
  )
  const value = Number(f.value) || 0
  const finalPrice =
    f.pricing_type === 'fixed_price' ? value : f.pricing_type === 'percent_off' ? basePrice * (1 - value / 100) : Math.max(0, basePrice - value)

  const setQty = (id: string, q: number) =>
    setF((s) => {
      const items = { ...s.items }
      if (q <= 0) delete items[id]
      else items[id] = Math.min(q, 100)
      return { ...s, items }
    })

  const toggle = (list: 'targetProducts' | 'targetCategories', id: string) =>
    setF((s) => ({ ...s, [list]: s[list].includes(id) ? s[list].filter((x) => x !== id) : [...s[list], id] }))

  const pricing = PRICING[f.kind].find((o) => o.value === f.pricing_type)

  /** Problema del precio, con números concretos; null si está bien o aún no hay datos. */
  const priceIssue = (() => {
    if (f.pricing_type === 'two_for_one') return null
    if (f.kind === 'bundle' && basePrice <= 0) return 'Primero agrega los productos del combo; así se calcula su precio normal.'
    if (!f.value) return null
    if (!(value > 0)) return 'Escribe un número mayor a 0.'
    if (f.pricing_type === 'percent_off' && (value < 1 || value > 100)) return 'El porcentaje debe estar entre 1 y 100.'
    if (f.kind === 'bundle' && f.pricing_type === 'fixed_price' && value > basePrice)
      return `Comprar los productos por separado cuesta ${formatMoney(basePrice)}. El precio del combo no puede ser mayor.`
    if (f.kind === 'bundle' && f.pricing_type === 'amount_off' && value >= basePrice)
      return `El descuento debe ser menor que el precio normal (${formatMoney(basePrice)}).`
    return null
  })()

  const changeKind = (kind: PromotionKind) => setF((s) => ({ ...s, kind, pricing_type: PRICING[kind][0].value, value: '' }))

  function validate(): string | null {
    if (!f.name.trim()) return 'Ponle un nombre a la promoción.'
    if (f.kind === 'bundle' && Object.keys(f.items).length === 0) return 'Agrega al menos un producto al combo.'
    if (f.kind === 'discount' && f.targetProducts.length + f.targetCategories.length === 0) return 'Elige a qué productos o categorías aplica el descuento.'
    if (priceIssue) return `Precio: ${priceIssue}`
    if (f.pricing_type !== 'two_for_one' && !(value > 0)) return `Precio: escribe el ${(pricing?.field ?? 'valor').toLowerCase()}.`
    if (f.start_date && f.end_date && f.end_date < f.start_date) return 'La fecha de fin no puede ser anterior a la de inicio.'
    if (Boolean(f.start_time) !== Boolean(f.end_time)) return 'Completa la hora de inicio y de fin, o deja ambas vacías.'
    if (f.withCode && !/^[A-Za-z0-9_-]{3,50}$/.test(f.code.trim())) return 'El código debe tener de 3 a 50 letras, números o guiones, sin espacios.'
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)
    setError(null)
    const input: PromotionInput = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      kind: f.kind,
      pricing_type: f.pricing_type,
      value: f.pricing_type === 'two_for_one' ? 0 : value,
      ...(f.kind === 'bundle'
        ? { items: Object.entries(f.items).map(([product_id, quantity]) => ({ product_id, quantity })) }
        : { targets: [...f.targetProducts.map((product_id) => ({ product_id })), ...f.targetCategories.map((category_id) => ({ category_id }))] }),
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      days_of_week: f.days.length && f.days.length < 7 ? [...f.days].sort() : null,
      start_time: f.start_time || null,
      end_time: f.end_time || null,
      code: f.withCode ? f.code.trim().toUpperCase() : null,
      max_uses: f.max_uses ? Number(f.max_uses) : null,
      is_active: f.is_active,
    }
    try {
      await save.mutateAsync({ id: promotion?.id, input })
      toast.success(isEdit ? 'Promoción actualizada' : 'Promoción creada', { description: input.name })
      onDone()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col" noValidate>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="font-display text-xl">{isEdit ? 'Editar promoción' : 'Nueva promoción'}</SheetTitle>
        <SheetDescription>Combos de varios productos o descuentos, con fechas, días y horario.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        <Section title="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { kind: 'bundle', icon: Package, title: 'Combo', text: 'Varios productos por un precio' },
                { kind: 'discount', icon: Percent, title: 'Descuento', text: 'Rebaja sobre productos o categorías' },
              ] as const
            ).map((o) => (
              <button
                key={o.kind}
                type="button"
                disabled={isEdit && f.kind !== o.kind}
                onClick={() => changeKind(o.kind)}
                aria-pressed={f.kind === o.kind}
                className={cn(
                  'flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  f.kind === o.kind ? 'border-primary bg-primary-soft' : 'hover:bg-secondary',
                )}
              >
                <o.icon className={cn('size-5', f.kind === o.kind ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-semibold">{o.title}</span>
                <span className="text-[13px] text-muted-foreground">{o.text}</span>
              </button>
            ))}
          </div>
          {isEdit && <p className="text-[13px] text-muted-foreground">El tipo no se puede cambiar después de crearla.</p>}
        </Section>

        <Section title="Nombre">
          <Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder={f.kind === 'bundle' ? 'Ej. ASA2' : 'Ej. Happy hour de cervezas'} maxLength={150} />
          <Textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Descripción para el personal (opcional)" rows={2} maxLength={1000} />
        </Section>

        {f.kind === 'bundle' ? (
          <Section title="Productos del combo" hint="Elige los productos y cuántas unidades lleva cada uno.">
            {Object.keys(f.items).length > 0 && (
              <ul className="flex flex-col divide-y rounded-xl border">
                {Object.entries(f.items).map(([id, q]) => {
                  const p = sellable.find((x) => x.id === id)
                  return (
                    <li key={id} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{p?.name ?? 'Producto'}</span>
                      <span className="text-xs text-muted-foreground">{formatMoney((p?.price ?? 0) * q)}</span>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="icon-sm" onClick={() => setQty(id, q - 1)} aria-label="Quitar uno">
                          <Minus />
                        </Button>
                        <span className="w-7 text-center text-sm font-semibold">{q}</span>
                        <Button type="button" variant="outline" size="icon-sm" onClick={() => setQty(id, q + 1)} aria-label="Agregar uno">
                          <Plus />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto" className="pl-9" />
            </div>
            <ul className="flex max-h-56 flex-col overflow-y-auto rounded-xl border">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setQty(p.id, (f.items[p.id] ?? 0) + 1)}
                    className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-muted-foreground">{formatMoney(p.price)}</span>
                    {f.items[p.id] ? <span className="text-xs font-semibold text-primary">× {f.items[p.id]}</span> : <Plus className="size-4 text-muted-foreground" />}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados.</li>}
            </ul>
          </Section>
        ) : (
          <Section title="Dónde aplica" hint="Elige productos, categorías completas o ambos.">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle('targetCategories', c.id)}
                  aria-pressed={f.targetCategories.includes(c.id)}
                  className={cn(
                    'h-9 cursor-pointer rounded-full border px-3.5 text-sm transition-colors',
                    f.targetCategories.includes(c.id) ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-secondary',
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto" className="pl-9" />
            </div>
            <ul className="flex max-h-56 flex-col overflow-y-auto rounded-xl border">
              {filtered.map((p) => {
                const on = f.targetProducts.includes(p.id)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle('targetProducts', p.id)}
                      aria-pressed={on}
                      className={cn('flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-secondary', on && 'bg-primary-soft')}
                    >
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-muted-foreground">{formatMoney(p.price)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        <Section title={f.kind === 'bundle' ? '¿Cómo se cobra el combo?' : '¿Qué descuento se aplica?'} hint="Elige una sola opción.">
          <div role="radiogroup" aria-label="Forma de cobro" className="grid gap-2 sm:grid-cols-3">
            {PRICING[f.kind].map((o) => {
              const on = f.pricing_type === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setF((st) => ({ ...st, pricing_type: o.value, value: '' }))}
                  className={cn(
                    'flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-[background-color,border-color] duration-150',
                    on ? 'border-primary bg-primary-soft' : 'hover:bg-secondary',
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold">
                    {o.label}
                    <span className={cn('grid size-4 shrink-0 place-items-center rounded-full border', on ? 'border-primary' : 'border-input')} aria-hidden>
                      {on && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                  </span>
                  <span className="text-[12px] leading-snug text-muted-foreground">{o.hint}</span>
                </button>
              )
            })}
          </div>

          {pricing?.field && (
            <div className="grid gap-1.5">
              <Label htmlFor="pd-value">{pricing.field}</Label>
              <div className="relative max-w-48">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">{pricing.unit}</span>
                <Input
                  id="pd-value"
                  inputMode="decimal"
                  value={f.value}
                  onChange={(e) => set('value', e.target.value.replace(',', '.').replace(/[^\d.]/g, '').match(/^\d*(\.\d{0,2})?/)?.[0] ?? '')}
                  placeholder={pricing.unit === '%' ? '10' : '0.00'}
                  aria-invalid={Boolean(priceIssue)}
                  aria-describedby="pd-value-help"
                  className={cn(pricing.unit === 'Bs' ? 'pl-10' : 'pl-8')}
                />
              </div>
              <p id="pd-value-help" className={cn('text-[13px]', priceIssue ? 'text-destructive' : 'text-muted-foreground')}>
                {priceIssue ?? (f.kind === 'bundle' ? `Precio normal de los productos: ${formatMoney(basePrice)}.` : 'Se aplica a cada producto elegido.')}
              </p>
            </div>
          )}

          {f.kind === 'bundle' && basePrice > 0 && value > 0 && !priceIssue && (
            <div className="flex items-baseline justify-between rounded-xl bg-secondary px-4 py-3">
              <span className="text-sm text-muted-foreground">
                <span className="line-through">{formatMoney(basePrice)}</span>
                {finalPrice < basePrice && <> · el cliente ahorra {formatMoney(basePrice - finalPrice)}</>}
              </span>
              <span className="font-display text-xl font-semibold">{formatMoney(finalPrice)}</span>
            </div>
          )}
        </Section>

        <Section title="Cuándo aplica" hint="Deja vacío lo que no quieras limitar.">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pd-start">Desde</Label>
              <DatePicker id="pd-start" clearable placeholder="Sin límite" value={f.start_date} max={f.end_date || undefined} onChange={(d) => set('start_date', d)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pd-end">Hasta</Label>
              <DatePicker id="pd-end" clearable placeholder="Sin límite" value={f.end_date} min={f.start_date || undefined} onChange={(d) => set('end_date', d)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Días</Label>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d, i) => {
                const on = f.days.includes(i)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('days', on ? f.days.filter((x) => x !== i) : [...f.days, i])}
                    className={cn('h-10 cursor-pointer rounded-lg border text-sm transition-colors', on ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-secondary')}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <p className="text-[13px] text-muted-foreground">{f.days.length ? 'Solo los días marcados.' : 'Todos los días.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pd-ts">Hora de inicio</Label>
              <TimePicker id="pd-ts" clearable placeholder="Sin límite" step={30} value={f.start_time} onChange={(v) => set('start_time', v)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pd-te">Hora de fin</Label>
              <TimePicker id="pd-te" clearable placeholder="Sin límite" step={30} value={f.end_time} onChange={(v) => set('end_time', v)} />
            </div>
          </div>
        </Section>

        <Section title="Código y límite">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Solo con código</span>
              <span className="block text-[13px] text-muted-foreground">El mesero o cajero lo escribe para aplicarla.</span>
            </span>
            <Switch checked={f.withCode} onCheckedChange={(v) => set('withCode', v)} />
          </label>
          {f.withCode && (
            <Input value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Ej. ASA2" className="font-semibold tracking-wider" maxLength={50} />
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pd-max">Máximo de usos (opcional)</Label>
            <Input id="pd-max" inputMode="numeric" value={f.max_uses} onChange={(e) => set('max_uses', e.target.value.replace(/\D/g, ''))} className="max-w-40" />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-medium">Activa</span>
            <Switch checked={f.is_active} onCheckedChange={(v) => set('is_active', v)} />
          </label>
        </Section>
      </div>

      <div className="flex flex-col gap-3 border-t bg-card px-5 py-4">
        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <X className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={save.isPending}>
            {save.isPending && <LoaderCircle className="animate-spin" />} {isEdit ? 'Guardar cambios' : 'Crear promoción'}
          </Button>
        </div>
      </div>
    </form>
  )
}
