import { useState, type FormEvent } from 'react'
import { Award, Clock, LoaderCircle, Lock, Share2, Unlock, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/app/providers/AuthProvider'
import { useBranding } from '@/app/providers/BrandingProvider'
import { parseAmount } from '@/lib/amount'
import { getErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CashSession, CashStatus, DaySummary } from '@/types/finance'
import { fetchDaySummary, useCashActions } from './api'

/** Caja cerrada: un solo paso para abrir el turno. */
export function OpenRegisterPanel() {
  const { open } = useCashActions()
  const [amount, setAmount] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await open.mutateAsync(parseAmount(amount) ?? 0)
      toast.success('Caja abierta', { description: 'Ya puedes cobrar.' })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="page-enter mx-auto flex w-full max-w-md flex-col items-center gap-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary">
        <Lock className="size-6 text-muted-foreground" />
      </span>
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">La caja está cerrada</h1>
        <p className="mt-1 text-muted-foreground">Cuenta el cambio con el que empiezas el turno y abre la caja para cobrar.</p>
      </div>
      <form onSubmit={submit} className="flex w-full flex-col gap-3 text-left">
        <Label htmlFor="start-cash">Cambio inicial</Label>
        <MoneyInput id="start-cash" autoFocus value={amount} onValueChange={setAmount} placeholder="0,00" className="h-12 text-lg" />
        <Button type="submit" size="lg" disabled={open.isPending}>
          {open.isPending ? <LoaderCircle className="animate-spin" /> : <Unlock />} Abrir caja
        </Button>
      </form>
    </div>
  )
}

const ROWS = [
  { key: 'cash', label: 'Efectivo en caja', hint: 'Incluye el cambio inicial' },
  { key: 'qr', label: 'QR', hint: 'Según el extracto del banco' },
  { key: 'card', label: 'Tarjeta', hint: 'Según el POS' },
] as const

function diffTone(d: number) {
  if (Math.abs(d) < 0.005) return 'text-success'
  return d > 0 ? 'text-info' : 'text-destructive'
}

function diffLabel(d: number) {
  if (Math.abs(d) < 0.005) return 'Cuadra'
  return d > 0 ? `Sobra ${formatMoney(d)}` : `Falta ${formatMoney(-d)}`
}

/** Cierre guiado: lo esperado contra lo contado en cada forma de pago. */
export function CloseRegisterDialog({ status, open, onOpenChange }: { status: CashStatus; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">{open && <CloseBody status={status} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  )
}

function CloseBody({ status, onDone }: { status: CashStatus; onDone: () => void }) {
  const { close } = useCashActions()
  // El cajero ve solo su caja; el resumen de ventas del día es para admin y dueño.
  const { hasRole } = useAuth()
  const seesDaySummary = hasRole(['admin'])
  const [counted, setCounted] = useState({ cash: '', qr: '', card: '' })
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<{ session: CashSession; summary: DaySummary | null } | null>(null)

  const expected = status.expected
  const needs = { cash: true, qr: Number(expected.qr) > 0, card: Number(expected.card) > 0 }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (counted.cash === '') return toast.error('Escribe cuánto efectivo contaste.')
    try {
      const session = await close.mutateAsync({
        cash_count: Number(counted.cash),
        qr_count: needs.qr && counted.qr !== '' ? Number(counted.qr) : undefined,
        card_count: needs.card && counted.card !== '' ? Number(counted.card) : undefined,
        notes: notes.trim() || undefined,
      })
      setResult({ session, summary: seesDaySummary ? await fetchDaySummary() : null })
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (result) return <CloseResult session={result.session} summary={result.summary} onDone={onDone} />

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Cerrar caja</DialogTitle>
        <DialogDescription>Cuenta el dinero y escribe lo que tienes. Te mostramos si cuadra.</DialogDescription>
      </DialogHeader>
      <ul className="flex flex-col divide-y rounded-xl border">
        {ROWS.filter((r) => needs[r.key]).map((r) => {
          const exp = Number(expected[r.key])
          const val = parseAmount(counted[r.key])
          const diff = val == null ? null : val - exp
          return (
            <li key={r.key} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.hint}</span>
                </span>
                <span className="text-right text-sm text-muted-foreground tabular-nums">
                  Esperado <span className="font-semibold text-foreground">{formatMoney(exp)}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <MoneyInput value={counted[r.key]} onValueChange={(v) => setCounted((c) => ({ ...c, [r.key]: v }))} placeholder="Contado" aria-label={`${r.label} contado`} autoFocus={r.key === 'cash'} />
                </div>
                <span className={cn('w-32 text-right text-sm font-medium tabular-nums transition-colors', diff == null ? 'text-muted-foreground' : diffTone(diff))}>
                  {diff == null ? '—' : diffLabel(diff)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <Label htmlFor="close-notes">Notas (opcional)</Label>
        <Textarea id="close-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. faltante por un vuelto mal dado" />
      </div>
      <Button type="submit" size="lg" variant="destructive" disabled={close.isPending}>
        {close.isPending ? <LoaderCircle className="animate-spin" /> : <Lock />} Cerrar caja
      </Button>
    </form>
  )
}

function CloseResult({ session, summary, onDone }: { session: CashSession; summary: DaySummary | null; onDone: () => void }) {
  const { name } = useBranding()
  const share = () => {
    const lines = [
      `${name} · Resumen del día`,
      summary && `Ventas: ${formatMoney(summary.total_sales)} en ${summary.orders_count} pedidos`,
      summary && `Ticket promedio: ${formatMoney(summary.average_ticket)}`,
      summary?.top_product && `Plato estrella: ${summary.top_product.name} (${summary.top_product.sold})`,
      summary?.peak_hour && `Hora pico: ${summary.peak_hour}`,
      ...(session.breakdown ?? []).map((b) => `${b.method}: ${diffLabel(Number(b.difference ?? 0))}`),
    ].filter(Boolean)
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Caja cerrada</DialogTitle>
        <DialogDescription>Así terminó el turno.</DialogDescription>
      </DialogHeader>
      <ul className="stagger-in flex flex-col divide-y rounded-xl border">
        {(session.breakdown ?? []).map((b) => (
          <li key={b.method} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium capitalize">{b.method.toLowerCase()}</span>
            <span className={cn('font-medium tabular-nums', diffTone(Number(b.difference ?? 0)))}>{diffLabel(Number(b.difference ?? 0))}</span>
          </li>
        ))}
      </ul>
      {summary && (
        <div className="stagger-in grid grid-cols-2 gap-2">
          <Stat label="Ventas del día" value={formatMoney(summary.total_sales)} />
          <Stat label="Pedidos" value={String(summary.orders_count)} />
          {summary.top_product && <Stat icon={UtensilsCrossed} label="Plato estrella" value={summary.top_product.name} />}
          {summary.peak_hour && <Stat icon={Clock} label="Hora pico" value={summary.peak_hour} />}
          {summary.top_waiter_by_sales && <Stat icon={Award} label="Más ventas" value={summary.top_waiter_by_sales.name} wide />}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={share}>
          <Share2 /> Enviar resumen
        </Button>
        <Button size="lg" onClick={onDone}>
          Listo
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon, wide }: { label: string; value: string; icon?: typeof Clock; wide?: boolean }) {
  return (
    <div className={cn('rounded-xl border px-3.5 py-3', wide && 'col-span-2')}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </p>
      <p className="mt-0.5 truncate font-display text-lg font-semibold">{value}</p>
    </div>
  )
}
