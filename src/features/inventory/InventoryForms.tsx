import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api/client'
import { formatMoney, toNumber } from '@/lib/format'
import type { Product } from '@/types/menu'
import { baseCost, displayCost, isWeight, toBase, toDisplay, useRestockProduct, useSupplyActions, type Supply } from './api'

const fmt = (n: number, d = 2) => n.toLocaleString('es-BO', { maximumFractionDigits: d })

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Alta y edición de materia prima. Se carga en kilos; la API guarda gramos. */
export function SupplyForm({ supply, onClose }: { supply: Supply | null; onClose: () => void }) {
  const { t } = useTranslation()
  const actions = useSupplyActions()
  const unit = supply?.unit ?? 'GRAMO'
  const u = { unit }
  const [name, setName] = useState(supply?.name ?? '')
  const [cost, setCost] = useState(supply ? String(Number(displayCost(supply).toFixed(2))) : '')
  const [stock, setStock] = useState(supply ? String(toDisplay(u, supply.current_stock)) : '')
  const [min, setMin] = useState(supply ? String(toDisplay(u, supply.min_stock_alert)) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const saving = actions.create.isPending || actions.update.isPending
  const unitLabel = isWeight(u) ? 'kg' : t('inventoryPage.unitShort')

  function submit(e: FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (name.trim().length < 2) errs.name = t('inventoryPage.form.nameRequired')
    if (!(toNumber(cost) > 0)) errs.cost = t('inventoryPage.form.costRequired')
    if (stock === '' || toNumber(stock) < 0) errs.stock = t('inventoryPage.form.stockRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return
    const input = {
      name: name.trim(),
      unit,
      cost_per_unit: baseCost(unit, toNumber(cost)),
      current_stock: Number(toBase(u, toNumber(stock)).toFixed(3)),
      min_stock_alert: Number(toBase(u, toNumber(min)).toFixed(3)),
    }
    const done = {
      onSuccess: () => {
        toast.success(supply ? t('inventoryPage.form.updated', { name: input.name }) : t('inventoryPage.form.created', { name: input.name }))
        onClose()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
    if (supply) actions.update.mutate({ id: supply.id, ...input }, done)
    else actions.create.mutate(input, done)
  }

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={supply ? t('inventoryPage.form.editTitle') : t('inventoryPage.new')}
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>{t('reservationsPage.form.cancel')}</Button>
          <Button type="submit" form="supply-form" className="h-11" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />} {t('tablesPage.form.save')}
          </Button>
        </>
      }
    >
      <form id="supply-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
        <Field id="sup-name" label={t('inventoryPage.form.name')} error={errors.name}>
          <Input id="sup-name" value={name} maxLength={120} autoFocus={!supply} onChange={(e) => setName(e.target.value)} placeholder={t('inventoryPage.form.namePlaceholder')} aria-invalid={!!errors.name} />
        </Field>
        <Field id="sup-cost" label={t('inventoryPage.form.cost', { unit: unitLabel })} error={errors.cost} hint={t('inventoryPage.form.costHint')}>
          <MoneyInput id="sup-cost" value={cost} onValueChange={setCost} aria-invalid={!!errors.cost} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="sup-stock" label={t('inventoryPage.form.stock', { unit: unitLabel })} error={errors.stock}>
            <Input id="sup-stock" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value.replace(',', '.'))} aria-invalid={!!errors.stock} />
          </Field>
          <Field id="sup-min" label={t('inventoryPage.form.min', { unit: unitLabel })} hint={t('inventoryPage.form.minHint')}>
            <Input id="sup-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value.replace(',', '.'))} />
          </Field>
        </div>
      </form>
    </ResponsivePanel>
  )
}

type RestockTarget = { kind: 'supply'; item: Supply } | { kind: 'product'; item: Product & { purchase_price?: number | null } }

/** Registrar una compra: suma al stock y, si cambió, actualiza el costo. */
export function RestockForm({ target, onClose }: { target: RestockTarget; onClose: () => void }) {
  const { t } = useTranslation()
  const actions = useSupplyActions()
  const restockProduct = useRestockProduct()
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState<string | null>(null)
  const saving = actions.addStock.isPending || restockProduct.isPending

  const weight = target.kind === 'supply' && isWeight(target.item)
  const unitLabel = weight ? 'kg' : t('inventoryPage.unitShort')
  const current = target.kind === 'supply' ? toDisplay(target.item, target.item.current_stock) : toNumber(target.item.stock)
  const currentCost = target.kind === 'supply' ? displayCost(target.item) : toNumber(target.item.purchase_price)
  const add = toNumber(qty)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!(add > 0)) return setError(t('inventoryPage.restock.qtyRequired'))
    if (target.kind === 'product' && !Number.isInteger(add)) return setError(t('inventoryPage.restock.wholeUnits'))
    setError(null)
    const newCost = cost === '' ? undefined : toNumber(cost)
    const done = {
      onSuccess: () => {
        toast.success(t('inventoryPage.restock.done', { name: target.item.name }))
        onClose()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
    if (target.kind === 'supply') {
      actions.addStock.mutate(
        { id: target.item.id, quantity: Number(toBase(target.item, add).toFixed(3)), new_cost: newCost == null ? undefined : baseCost(target.item.unit, newCost) },
        done,
      )
    } else {
      restockProduct.mutate({ product: target.item, add, purchase_price: newCost }, done)
    }
  }

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={t('inventoryPage.restock.title', { name: target.item.name })}
      description={t('inventoryPage.restock.current', { value: fmt(current), unit: unitLabel })}
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>{t('reservationsPage.form.cancel')}</Button>
          <Button type="submit" form="restock-form" className="h-11" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />} {t('inventoryPage.restock.save')}
          </Button>
        </>
      }
    >
      <form id="restock-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
        <Field id="rs-qty" label={t('inventoryPage.restock.qty', { unit: unitLabel })} error={error ?? undefined}>
          <Input id="rs-qty" inputMode={weight ? 'decimal' : 'numeric'} autoFocus value={qty} onChange={(e) => { setQty(e.target.value.replace(',', '.')); setError(null) }} aria-invalid={!!error} />
        </Field>
        <Field id="rs-cost" label={t('inventoryPage.restock.cost', { unit: unitLabel })} hint={t('inventoryPage.restock.costHint', { cost: formatMoney(currentCost) })}>
          <MoneyInput id="rs-cost" value={cost} onValueChange={setCost} placeholder={currentCost ? currentCost.toFixed(2) : undefined} />
        </Field>
        {add > 0 && (
          <p className="rounded-lg bg-secondary px-3.5 py-2.5 text-sm">
            {t('inventoryPage.restock.after', { value: fmt(current + add), unit: unitLabel })}
          </p>
        )}
      </form>
    </ResponsivePanel>
  )
}

export type { RestockTarget }
