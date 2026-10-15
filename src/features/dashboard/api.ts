import { keepPreviousData, useQuery } from '@tanstack/react-query'
import api from '@/lib/api/client'
import type { DateRange } from '@/lib/date-range'
import { toNumber } from '@/lib/format'

export interface Kpis {
  total_revenue: number
  net_profit: number
  average_ticket: number
  profit_margin: number
}
export interface Ranked {
  name: string
  sold: number
  revenue: number
  profit?: number
}
export interface Channels {
  dine_in: { count: number; total: number }
  pickup: { count: number; total: number }
}
export interface PaymentRow {
  method: string
  count: number
  total: number
}
export interface YearRow {
  month: string
  year_current: number
  year_past: number
}
export interface HourRow {
  hour: string
  orders_count: number
}
export interface WeekdayRow {
  day: string
  average_sales: number
  traffic: number
}

const opts = { staleTime: 60_000, placeholderData: keepPreviousData, retry: 1 } as const
const get = async <T>(url: string, params: Record<string, unknown>) => (await api.get<T>(url, { params })).data

/** La API acordó números como números; aun así normalizamos por si llega texto ("25.00"). */
const num = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const out = { ...row }
  for (const k of keys) (out[k] as unknown) = toNumber(row[k])
  return out
}

export function useDashboard(range: DateRange) {
  const p = { from: range.from, to: range.to }
  const year = Number(range.to.slice(0, 4))
  return {
    kpis: useQuery({
      queryKey: ['analytics', 'kpi', p],
      queryFn: async () => num(await get<Kpis>('/analytics/dashboard-kpi', p), ['total_revenue', 'net_profit', 'average_ticket', 'profit_margin']),
      ...opts,
    }),
    channels: useQuery({
      queryKey: ['analytics', 'channels', p],
      queryFn: async () => {
        const c = await get<Channels>('/analytics/channels', p)
        return {
          dine_in: { count: toNumber(c?.dine_in?.count), total: toNumber(c?.dine_in?.total) },
          pickup: { count: toNumber(c?.pickup?.count), total: toNumber(c?.pickup?.total) },
        }
      },
      ...opts,
    }),
    payments: useQuery({
      queryKey: ['analytics', 'payments', p],
      queryFn: async () => (await get<PaymentRow[]>('/analytics/payment-methods', p)).map((r) => num(r, ['count', 'total'])),
      ...opts,
    }),
    topProducts: useQuery({
      queryKey: ['analytics', 'top-products', p],
      queryFn: async () => (await get<Ranked[]>('/analytics/top-products', { ...p, limit: 6 })).map((r) => num(r, ['sold', 'revenue'])),
      ...opts,
    }),
    topProfitable: useQuery({
      queryKey: ['analytics', 'top-profitable', p],
      queryFn: async () => (await get<Ranked[]>('/analytics/top-profitable', { ...p, limit: 6 })).map((r) => num(r, ['sold', 'revenue', 'profit'])),
      ...opts,
    }),
    peakHours: useQuery({
      queryKey: ['analytics', 'peak-hours', p],
      queryFn: async () => (await get<HourRow[]>('/analytics/peak-hours', p)).map((r) => num(r, ['orders_count'])),
      ...opts,
    }),
    weekly: useQuery({
      queryKey: ['analytics', 'weekly', p],
      queryFn: async () => ((await get<WeekdayRow[] | null>('/analytics/weekly-pattern', p)) ?? []).map((r) => num(r, ['average_sales', 'traffic'])),
      ...opts,
    }),
    year: useQuery({
      queryKey: ['analytics', 'year', year],
      queryFn: async () => {
        const r = await get<{ data: YearRow[] }>('/analytics/year-comparison', { year })
        return (r?.data ?? []).map((row) => num(row, ['year_current', 'year_past']))
      },
      ...opts,
    }),
  }
}
