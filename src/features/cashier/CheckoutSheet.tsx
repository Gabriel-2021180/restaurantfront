import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Banknote, CircleCheck, CreditCard, LoaderCircle, Minus, Plus, Printer, QrCode, Split, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { InvoiceTicket, type InvoiceFull } from '@/features/print/InvoiceTicket'
import { printTicket } from '@/features/print/print'
import { placeName } from '@/features/orders/utils'
import { parseAmount } from '@/lib/amount'
import { getErrorCode, getErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CreateInvoiceInput, InvoiceCreated, PayMethod } from '@/types/finance'
import type { Order } from '@/types/order'
import { findClientByNit, useCashActions, useInvoice, useOrderBilling, useStaticQr } from './api'

type Mode = 'full' | 'items' | 'equal'
type Method = PayMethod | 'MIXTO'

const round2 = (n: number) => Math.round(n * 100) / 100
const METHODS: { value: Method; label: string; icon: typeof Banknote }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { value: 'QR', label: 'QR', icon: QrCode },
  { value: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
  { value: 'MIXTO', label: 'Mixto', icon: Split },
]

/** Montos rápidos de efectivo: exacto y los billetes siguientes. */
function quickCash(amount: number) {
  const options = new Set<number>([round2(amount)])
  for (const step of [10, 20, 50, 100, 200]) options.add(Math.ceil(amount / step) * step)
  return [...options].filter((v) => v >= amount).sort((a, b) => a - b).slice(0, 4)
}

function Choice<T extends string>({ value, options, onChange, disabled }: { value: T; options: { value: T; label: string; icon?: typeof Banknote }[]; onChange: (v: T) => void; disabled?: (v: T) => boolean }) {
  return (
    <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-[10px] bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled?.(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            value === o.value && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
          )}
        >
          {o.icon && <o.icon className="size-4" />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function CheckoutSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(order)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        {order && <Checkout key={order.id} order={order} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  )
}

function Checkout({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useTranslation()
  const billing = useOrderBilling(order.id)
  const { invoice } = useCashActions()
  const [done, setDone] = useState<InvoiceCreated | null>(null)
  const place = placeName(order, t)

  const [mode, setMode] = useState<Mode>('full')
  const [sel, setSel] = useState<Record<string, number>>({})
  const [partsLeft, setPartsLeft] = useState(2)
  const [nit, setNit] = useState('')
  const [name, setName] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [method, setMethod] = useState<Method>('EFECTIVO')
  const [received, setReceived] = useState('')
  const [mixed, setMixed] = useState<Record<PayMethod, string>>({ EFECTIVO: '', QR: '', TARJETA: '' })
  const [qrOk, setQrOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usesQr = method === 'QR' || (method === 'MIXTO' && Number(mixed.QR) > 0)
  const qr = useStaticQr(usesQr)

  const b = billing.data
  const pending = b ? Number(b.pending) : Number(order.total)
  const splitLocked = b?.split_mode && b.split_mode !== 'none' ? b.split_mode : null

  const amount = useMemo(() => {
    if (!b) return 0
    if (mode === 'items')
      return round2(b.items.reduce((s, i) => s + (Number(i.subtotal) / i.quantity) * (sel[i.detail_id] ?? 0), 0))
    if (mode === 'equal') return partsLeft <= 1 ? round2(pending) : round2(pending / partsLeft)
    return round2(pending)
  }, [b, mode, sel, partsLeft, pending])

  const receivedNum = parseAmount(received)
  const cashPart = method === 'EFECTIVO' ? amount : method === 'MIXTO' ? Number(mixed.EFECTIVO) || 0 : 0
  const change = cashPart > 0 && receivedNum != null ? round2(receivedNum - cashPart) : 0
  const mixedSum = round2((Number(mixed.EFECTIVO) || 0) + (Number(mixed.QR) || 0) + (Number(mixed.TARJETA) || 0))

  async function lookupNit() {
    const clean = nit.trim()
    if (clean.length < 4 || clean === '0' || name.trim()) return
    setLookingUp(true)
    const found = await findClientByNit(clean)
    setLookingUp(false)
    if (found?.name) setName(found.name)
  }

  function validate(): string | null {
    if (!(amount > 0)) return mode === 'items' ? 'Elige qué platos se cobran en esta cuenta.' : 'No hay nada pendiente por cobrar.'
    if (amount > pending + 0.005) return 'El monto supera lo que falta cobrar.'
    if (cashPart > 0 && receivedNum != null && receivedNum < cashPart) return 'El efectivo recibido es menor al monto en efectivo.'
    if (method === 'MIXTO') {
      if (Math.abs(mixedSum - amount) > 0.005) return `La suma de los pagos (${formatMoney(mixedSum)}) debe ser igual a ${formatMoney(amount)}.`
      if ([mixed.EFECTIVO, mixed.QR, mixed.TARJETA].filter((v) => Number(v) > 0).length < 2) return 'Un pago mixto necesita al menos dos formas de pago.'
    }
    if (usesQr && !qrOk) return 'Confirma que el pago por QR llegó a la cuenta.'
    return null
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (invoice.isPending) return
    const problem = validate()
    if (problem) return setError(problem)
    setError(null)
    const body: CreateInvoiceInput = {
      order_id: order.id,
      client_nit: nit.trim() || '0',
      client_name: name.trim() || 'SIN NOMBRE',
    }
    if (method === 'MIXTO') {
      body.payments = (['EFECTIVO', 'QR', 'TARJETA'] as PayMethod[])
        .filter((m) => Number(mixed[m]) > 0)
        .map((m) => ({ method: m, amount: round2(Number(mixed[m])) }))
    } else {
      body.payment_method = method
    }
    if (cashPart > 0 && receivedNum != null) body.amount_received = receivedNum
    if (mode === 'items') body.items = Object.entries(sel).filter(([, q]) => q > 0).map(([detail_id, quantity]) => ({ detail_id, quantity }))
    if (mode === 'equal' && partsLeft > 1) body.amount = amount

    try {
      const res = await invoice.mutateAsync(body)
      setDone(res)
    } catch (err) {
      const code = getErrorCode(err)
      setError(code === 'CASH_REGISTER_CLOSED' ? 'La caja está cerrada. Ábrela para poder cobrar.' : getErrorMessage(err))
    }
  }

  function nextPart() {
    setDone(null)
    setSel({})
    setReceived('')
    setMixed({ EFECTIVO: '', QR: '', TARJETA: '' })
    setQrOk(false)
    setNit('')
    setName('')
    if (mode === 'equal') setPartsLeft((n) => Math.max(1, n - 1))
    void billing.refetch()
  }

  if (done) return <Success result={done} place={place} onNext={done.pending > 0.005 ? nextPart : undefined} onClose={onClose} />

  return (
    <form onSubmit={submit} noValidate className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="font-display text-xl">Cobrar · {place}</SheetTitle>
        <SheetDescription>
          {b && Number(b.billed) > 0 ? `Ya se cobró ${formatMoney(b.billed)} · falta ${formatMoney(pending)}` : `Total ${formatMoney(order.total)}`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        {billing.isLoading || !b ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 rounded-[10px]" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (
          <section className="flex flex-col gap-3">
            <Label>Cuenta</Label>
            <Choice<Mode>
              value={mode}
              onChange={(m) => {
                setMode(m)
                setError(null)
              }}
              disabled={(m) => (splitLocked === 'items' && m === 'equal') || (splitLocked === 'amount' && m === 'items')}
              options={[
                { value: 'full', label: Number(b.billed) > 0 ? 'Todo lo que falta' : 'Toda la cuenta' },
                { value: 'items', label: 'Por platos' },
                { value: 'equal', label: 'Partes iguales' },
              ]}
            />

            {mode === 'items' && (
              <ul className="flex flex-col divide-y rounded-xl border">
                {b.items.map((i) => {
                  const left = i.quantity - i.billed_quantity
                  const q = sel[i.detail_id] ?? 0
                  const unit = Number(i.subtotal) / i.quantity
                  return (
                    <li key={i.detail_id} className={cn('flex items-center gap-3 px-3 py-2.5', left <= 0 && 'opacity-45')}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.product}</p>
                        <p className="text-xs text-muted-foreground">
                          {left > 0 ? `${left} de ${i.quantity} por cobrar · ${formatMoney(unit)} c/u` : 'Ya cobrado'}
                        </p>
                      </div>
                      {left > 0 && (
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="outline" size="icon-sm" disabled={q <= 0} onClick={() => setSel((s) => ({ ...s, [i.detail_id]: q - 1 }))} aria-label="Quitar uno">
                            <Minus />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">{q}</span>
                          <Button type="button" variant="outline" size="icon-sm" disabled={q >= left} onClick={() => setSel((s) => ({ ...s, [i.detail_id]: q + 1 }))} aria-label="Agregar uno">
                            <Plus />
                          </Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {mode === 'equal' && (
              <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                <span className="text-sm">
                  Dividir lo que falta entre
                  <span className="block text-xs text-muted-foreground">{formatMoney(amount)} por persona</span>
                </span>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon-sm" disabled={partsLeft <= 2} onClick={() => setPartsLeft((n) => n - 1)} aria-label="Menos personas">
                    <Minus />
                  </Button>
                  <span className="w-8 text-center font-semibold tabular-nums">{partsLeft}</span>
                  <Button type="button" variant="outline" size="icon-sm" disabled={partsLeft >= 20} onClick={() => setPartsLeft((n) => n + 1)} aria-label="Más personas">
                    <Plus />
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <Label htmlFor="co-nit">Cliente</Label>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <div className="relative">
              <Input id="co-nit" inputMode="numeric" placeholder="NIT / CI" value={nit} onChange={(e) => setNit(e.target.value.replace(/[^\dA-Za-z-]/g, ''))} onBlur={lookupNit} />
              {lookingUp && <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            </div>
            <Input placeholder="Nombre o razón social" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre o razón social" />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserRound className="size-3.5" /> Vacío = sin NIT. Si el NIT ya facturó antes, el nombre se completa solo.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <Label>Forma de pago</Label>
          <Choice<Method>
            value={method}
            onChange={(m) => {
              setMethod(m)
              setQrOk(false)
              setError(null)
            }}
            options={METHODS}
          />

          {method === 'EFECTIVO' && amount > 0 && (
            <div className="flex flex-col gap-2">
              <MoneyInput value={received} onValueChange={setReceived} placeholder={`Recibido (exacto ${formatMoney(amount).replace('Bs ', '')})`} aria-label="Efectivo recibido" />
              <div className="flex flex-wrap gap-1.5">
                {quickCash(amount).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setReceived(String(v))}
                    className="h-9 cursor-pointer rounded-full border px-3 text-sm tabular-nums transition-colors hover:bg-secondary active:scale-95"
                  >
                    {formatMoney(v)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {method === 'MIXTO' && (
            <div className="flex flex-col gap-2 rounded-xl border p-3">
              {(['EFECTIVO', 'QR', 'TARJETA'] as PayMethod[]).map((m) => (
                <div key={m} className="grid grid-cols-[6rem_1fr] items-center gap-2">
                  <span className="text-sm">{METHODS.find((x) => x.value === m)?.label}</span>
                  <MoneyInput value={mixed[m]} onValueChange={(v) => setMixed((s) => ({ ...s, [m]: v }))} placeholder="0,00" aria-label={`Monto ${m}`} />
                </div>
              ))}
              <p className={cn('text-right text-xs tabular-nums', Math.abs(mixedSum - amount) <= 0.005 ? 'text-success' : 'text-muted-foreground')}>
                {formatMoney(mixedSum)} de {formatMoney(amount)}
                {mixedSum < amount && ` · faltan ${formatMoney(amount - mixedSum)}`}
              </p>
              {Number(mixed.EFECTIVO) > 0 && (
                <MoneyInput value={received} onValueChange={setReceived} placeholder="Efectivo recibido (opcional)" aria-label="Efectivo recibido" />
              )}
            </div>
          )}

          {usesQr && (
            <div className="flex flex-col items-center gap-3 rounded-xl border p-4 text-center">
              {qr.isLoading ? (
                <Skeleton className="size-48 rounded-lg" />
              ) : qr.data?.qr_static_url ? (
                <img src={qr.data.qr_static_url} alt="QR de cobro del restaurante" className="size-48 rounded-lg bg-white object-contain p-2" />
              ) : (
                <p className="text-sm text-muted-foreground">No hay un QR del banco cargado. El administrador puede subirlo en Configuración.</p>
              )}
              <p className="font-display text-2xl font-semibold tabular-nums">{formatMoney(method === 'QR' ? amount : Number(mixed.QR) || 0)}</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={qrOk} onCheckedChange={(v) => setQrOk(v === true)} />
                Ya verifiqué que el pago llegó
              </label>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t bg-card px-5 py-4">
        {change > 0 && (
          <div className="flex items-baseline justify-between rounded-xl bg-success/10 px-4 py-2.5 text-success">
            <span className="text-sm font-medium">Vuelto</span>
            <span className="font-display text-2xl font-semibold tabular-nums">{formatMoney(change)}</span>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={invoice.isPending || !b}>
          {invoice.isPending && <LoaderCircle className="animate-spin" />}
          Cobrar {formatMoney(amount)}
        </Button>
      </div>
    </form>
  )
}

function Success({ result, place, onNext, onClose }: { result: InvoiceCreated; place: string; onNext?: () => void; onClose: () => void }) {
  const full = useInvoice<InvoiceFull>(result.id)

  const print = () => {
    if (!full.data) return toast.info('Preparando el ticket…')
    void printTicket(<InvoiceTicket invoice={full.data} />)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto px-5 py-8 text-center">
        <CircleCheck className="size-14 animate-[page-enter_400ms_var(--ease-out)_both] text-success" strokeWidth={1.6} />
        <div>
          <h2 className="font-display text-2xl font-semibold">Cobrado</h2>
          <p className="text-muted-foreground">
            {place} · Factura N° {result.invoice_number} · {formatMoney(result.total)}
          </p>
        </div>
        {Number(result.change) > 0 && (
          <div className="w-full rounded-xl bg-success/10 px-4 py-4 text-success">
            <p className="text-sm font-medium">Entregar de vuelto</p>
            <p className="font-display text-4xl font-semibold tabular-nums">{formatMoney(result.change)}</p>
          </div>
        )}
        {result.pending > 0.005 && (
          <p className="rounded-xl border px-4 py-3 text-sm">
            Falta cobrar <span className="font-semibold">{formatMoney(result.pending)}</span> de esta cuenta.
          </p>
        )}
        <div className="w-full overflow-hidden rounded-xl border bg-white">
          {full.data ? <InvoiceTicket invoice={full.data} /> : <Skeleton className="h-64 w-full" />}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t bg-card px-5 py-4">
        <Button variant="outline" size="lg" onClick={print} disabled={!full.data}>
          <Printer /> Imprimir
        </Button>
        {onNext ? (
          <Button size="lg" onClick={onNext}>
            Cobrar lo que falta
          </Button>
        ) : (
          <Button size="lg" onClick={onClose}>
            Listo
          </Button>
        )}
      </div>
    </div>
  )
}
