import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { FileText, Lock } from 'lucide-react'
import { PageFallback } from '@/components/layout/PageFallback'
import { Button } from '@/components/ui/button'
import api from '@/lib/api/client'
import { formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CashStatus } from '@/types/finance'
import { useCashStatus } from './api'

interface ShiftSummary {
  session: { id: string; opened_at: string; opened_by: string | null; starting_cash: number }
  sales: CashStatus['sales']
  expected: CashStatus['expected']
  invoices_count: number
  average_ticket: number
  top_products: { name: string; quantity: number }[]
  invoices: { id: string; invoice_number: string; total: number; payment_method: string; client_name: string; transaction_date: string; is_annulled: boolean }[]
}

/** Resumen del turno abierto del cajero (sin datos globales del negocio). */
function useShiftSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['finance', 'cash-register', 'current-summary'],
    queryFn: async () => {
      try {
        return (await api.get<ShiftSummary>('/finance/cash-register/current-summary')).data
      } catch (err) {
        // Mientras la API no tenga este endpoint, la pantalla usa solo el estado de caja.
        if (axios.isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }
    },
    enabled,
    refetchInterval: 30_000,
  })
}

export default function MyShiftPage() {
  const { i18n } = useTranslation()
  const status = useCashStatus()
  const summary = useShiftSummary(Boolean(status.data))

  if (status.isLoading) return <PageFallback variant="dashboard" />
  if (!status.data) {
    return (
      <div className="page-enter mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">No tienes un turno abierto</h1>
          <p className="mt-1 text-muted-foreground">Abre la caja para empezar a cobrar; aquí verás el resumen de tu turno.</p>
        </div>
        <Button asChild>
          <Link to="/cashier">Ir a Caja</Link>
        </Button>
      </div>
    )
  }

  const s = status.data
  const d = summary.data

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">Mi turno</h1>
        <p className="mt-1 text-muted-foreground">Desde las {formatTime(s.opened_at, i18n.language)} · cambio inicial {formatMoney(s.starting_cash)}</p>
      </div>

      <dl className="stagger-in grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
        {[
          { label: 'Cobrado en el turno', value: formatMoney(s.sales?.total ?? 0) },
          { label: 'Debe haber en caja', value: formatMoney(s.expected.cash) },
          { label: 'Facturas', value: d ? String(d.invoices_count) : '—' },
          { label: 'Ticket promedio', value: d ? formatMoney(d.average_ticket) : '—' },
        ].map((k) => (
          <div key={k.label} className="bg-card px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">{k.label}</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{k.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Por forma de pago</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {[
              { label: 'Efectivo', value: s.sales?.cash ?? 0 },
              { label: 'QR', value: s.sales?.qr ?? 0 },
              { label: 'Tarjeta', value: s.sales?.card ?? 0 },
            ].map((m) => {
              const salesTotal = s.sales?.total ?? 0
              const pct = salesTotal > 0 ? (m.value / salesTotal) * 100 : 0
              return (
                <li key={m.label} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex justify-between text-sm">
                    <span>{m.label}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(m.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>

          {d && d.top_products.length > 0 && (
            <>
              <h2 className="mt-2 font-display text-lg font-semibold">Lo más vendido</h2>
              <ol className="divide-y rounded-xl border bg-card">
                {d.top_products.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-semibold tabular-nums">{p.quantity}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Facturas del turno</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            {!d ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                {summary.isLoading ? 'Cargando…' : 'El detalle de facturas del turno estará disponible cuando la API lo publique.'}
              </p>
            ) : d.invoices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <FileText className="size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Todavía no cobraste nada en este turno.</p>
              </div>
            ) : (
              <ul className="stagger-in divide-y">
                {d.invoices.map((inv) => (
                  <li key={inv.id} className={cn('flex items-center gap-4 px-4 py-3', inv.is_annulled && 'opacity-50')}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        N° {inv.invoice_number} · {inv.client_name || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(inv.transaction_date, i18n.language)} · {inv.payment_method.toLowerCase()}
                        {inv.is_annulled && ' · anulada'}
                      </p>
                    </div>
                    <span className={cn('font-semibold tabular-nums', inv.is_annulled && 'line-through')}>{formatMoney(inv.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
