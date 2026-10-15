import { useLiveInterval } from '@/app/providers/SocketProvider'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api from '@/lib/api/client'
import { todayISO } from '@/lib/format'
import type { CashSession, CashStatus, CreateInvoiceInput, DaySummary, InvoiceCreated, OrderBilling } from '@/types/finance'
import type { Order } from '@/types/order'

export const cashKeys = {
  status: ['finance', 'cash-register', 'status'] as const,
  queue: ['orders', 'pending_payment'] as const,
  billing: (id: string) => ['orders', id, 'billing'] as const,
  invoice: (id: string) => ['finance', 'invoices', id] as const,
  qr: ['finance', 'qr'] as const,
}

/** Estado de caja: null = cerrada (la API responde 404 CASH_REGISTER_CLOSED). */
export function useCashStatus() {
  return useQuery({
    queryKey: cashKeys.status,
    queryFn: async () => {
      try {
        return (await api.get<CashStatus>('/finance/cash-register/status')).data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }
    },
    refetchInterval: 60_000,
  })
}

export function usePaymentQueue(enabled: boolean) {
  const interval = useLiveInterval(20_000)
  return useQuery({
    queryKey: cashKeys.queue,
    queryFn: async () => (await api.get<Order[]>('/orders', { params: { status: 'pending_payment' } })).data,
    enabled,
    refetchInterval: interval,
  })
}

export function useOrderBilling(orderId: string | null) {
  return useQuery({
    queryKey: cashKeys.billing(orderId ?? ''),
    queryFn: async () => (await api.get<OrderBilling>(`/orders/${orderId}/billing`)).data,
    enabled: Boolean(orderId),
  })
}

export function useStaticQr(enabled: boolean) {
  return useQuery({
    queryKey: cashKeys.qr,
    queryFn: async () => (await api.get<{ qr_static_url: string | null }>('/finance/qr')).data,
    enabled,
    staleTime: 10 * 60_000,
  })
}

export function useInvoice<T = unknown>(id: string | null) {
  return useQuery({
    queryKey: cashKeys.invoice(id ?? ''),
    queryFn: async () => (await api.get<T>(`/finance/invoices/${id}`)).data,
    enabled: Boolean(id),
  })
}

export async function findClientByNit(nit: string): Promise<{ nit: string; name: string } | null> {
  try {
    return (await api.get<{ nit: string; name: string }>('/finance/clients', { params: { nit } })).data
  } catch {
    return null
  }
}

export function useCashActions() {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: cashKeys.status })
    void qc.invalidateQueries({ queryKey: cashKeys.queue })
  }
  const open = useMutation({
    mutationFn: async (starting_cash: number) => (await api.post<CashSession>('/finance/cash-register/open', { starting_cash })).data,
    onSettled: refresh,
  })
  const close = useMutation({
    mutationFn: async (body: { cash_count: number; qr_count?: number; card_count?: number; notes?: string }) =>
      (await api.post<CashSession>('/finance/cash-register/close', body)).data,
    onSettled: refresh,
  })
  const invoice = useMutation({
    mutationFn: async (body: CreateInvoiceInput) => (await api.post<InvoiceCreated>('/finance/invoices', body)).data,
    onSettled: (_d, _e, body) => {
      refresh()
      void qc.invalidateQueries({ queryKey: cashKeys.billing(body.order_id) })
      void qc.invalidateQueries({ queryKey: ['tables'] })
    },
  })
  return { open, close, invoice }
}

export async function fetchDaySummary(): Promise<DaySummary | null> {
  try {
    return (await api.get<DaySummary>('/analytics/day-summary', { params: { date: todayISO() } })).data
  } catch {
    return null
  }
}
