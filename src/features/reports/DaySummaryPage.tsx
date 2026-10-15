import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Banknote, ChevronLeft, ChevronRight, Clock, CreditCard, History, QrCode, Receipt, ShoppingBag, Trophy, Utensils, XCircle } from 'lucide-react'
import { EmptyState, ErrorState, Meter, Page, PageHeader, Panel, Stat, StatGrid } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api/client'
import { addDaysISO, formatDayChip, formatMoney, formatTime, toNumber, todayISO } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CashSession, DaySummary } from '@/types/finance'
import { DatePicker } from '@/components/forms/DatePicker'

interface DailyReport {
  grand_total: number
  breakdown: { method: string; count: number; total: number }[]
}
type Summary = DaySummary & { cancelled?: number }

const METHOD_ICON: Record<string, typeof Banknote> = { EFECTIVO: Banknote, QR: QrCode, TARJETA: CreditCard }
const opts = { placeholderData: keepPreviousData, staleTime: 30_000 } as const
const who = (p: CashSession['openedBy']) => [p?.first_names, p?.last_names].filter(Boolean).join(' ') || '—'

function useDay(date: string) {
  const p = { from: date, to: date }
  return {
    summary: useQuery({ queryKey: ['analytics', 'day-summary', date], queryFn: async () => (await api.get<Summary>('/analytics/day-summary', { params: { date } })).data, ...opts }),
    report: useQuery({
      queryKey: ['finance', 'report-daily', date],
      queryFn: async () => {
        const r = (await api.get<DailyReport>('/finance/invoices/report/daily', { params: p })).data
        return { grand_total: toNumber(r?.grand_total), breakdown: (r?.breakdown ?? []).map((b) => ({ ...b, count: toNumber(b.count), total: toNumber(b.total) })) }
      },
      ...opts,
    }),
    channels: useQuery({
      queryKey: ['analytics', 'channels', p],
      queryFn: async () => {
        const c = (await api.get<{ dine_in: { count: number; total: number }; pickup: { count: number; total: number } }>('/analytics/channels', { params: p })).data
        return { dine_in: { count: toNumber(c?.dine_in?.count), total: toNumber(c?.dine_in?.total) }, pickup: { count: toNumber(c?.pickup?.count), total: toNumber(c?.pickup?.total) } }
      },
      ...opts,
    }),
    shifts: useQuery({
      queryKey: ['finance', 'daily-shifts', date],
      queryFn: async () => (await api.get<CashSession[]>('/finance/cash-register/daily-shifts', { params: p })).data ?? [],
      ...opts,
    }),
  }
}

export default function DaySummaryPage() {
  const { t, i18n } = useTranslation()
  const today = todayISO()
  const [date, setDate] = useState(today)
  const d = useDay(date)
  const s = d.summary.data
  const chip = formatDayChip(date, i18n.language)
  const loading = d.summary.isLoading || d.report.isLoading

  return (
    <Page>
      <PageHeader
        title={t('daySummary.title')}
        description={<span className="capitalize">{date === today ? t('daySummary.today') : `${chip.weekday} ${chip.day} ${chip.month}`}</span>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="size-10" onClick={() => setDate((x) => addDaysISO(x, -1))} aria-label={t('reservationsPage.prev')}>
          <ChevronLeft />
        </Button>
        <DatePicker value={date} max={today} onChange={setDate} className="h-10 w-[12rem]" aria-label={t('daySummary.date')} />
        <Button variant="outline" size="icon" className="size-10" onClick={() => setDate((x) => addDaysISO(x, 1))} disabled={date >= today} aria-label={t('reservationsPage.nextDay')}>
          <ChevronRight />
        </Button>
        {date !== today && (
          <Button variant="ghost" className="h-10" onClick={() => setDate(today)}>
            {t('reservationsPage.today')}
          </Button>
        )}
      </div>

      {d.summary.isError && d.report.isError ? (
        <Panel>
          <ErrorState error={d.summary.error} onRetry={() => { void d.summary.refetch(); void d.report.refetch() }} />
        </Panel>
      ) : (
        <StatGrid>
          <Stat icon={Banknote} label={t('daySummary.collected')} value={formatMoney(d.report.data?.grand_total ?? s?.total_sales)} loading={loading} />
          <Stat icon={Receipt} label={t('daySummary.orders')} value={toNumber(s?.orders_count)} loading={loading} hint={s?.cancelled ? t('daySummary.cancelled', { count: s.cancelled }) : undefined} />
          <Stat icon={ShoppingBag} label={t('dash.kpi.ticket')} value={formatMoney(s?.average_ticket)} loading={loading} />
          <Stat icon={Clock} label={t('daySummary.peak')} value={s?.peak_hour ?? '—'} loading={loading} />
        </StatGrid>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={t('daySummary.byMethod')} description={t('daySummary.byMethodHint')}>
          {d.report.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : d.report.isError ? (
            <ErrorState error={d.report.error} onRetry={() => void d.report.refetch()} className="py-6" />
          ) : !d.report.data?.breakdown.length ? (
            <EmptyState icon={Receipt} title={t('daySummary.noSales')} className="py-6" />
          ) : (
            <ul className="flex flex-col gap-3.5">
              {d.report.data.breakdown.map((b) => {
                const Icon = METHOD_ICON[b.method] ?? Banknote
                return (
                  <li key={b.method} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Icon className="size-3.5 text-muted-foreground" /> {t(`dash.method.${b.method}`, { defaultValue: b.method })}
                        <span className="text-[12px] font-normal text-muted-foreground">· {b.count}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatMoney(b.total)}</span>
                    </div>
                    <Meter value={b.total} max={d.report.data!.grand_total} />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title={t('dash.channels.title')} description={t('dash.channels.subtitle')}>
          {d.channels.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : d.channels.isError ? (
            <ErrorState error={d.channels.error} onRetry={() => void d.channels.refetch()} className="py-6" />
          ) : (
            <ul className="flex flex-col gap-3.5">
              {[
                { icon: Utensils, label: t('dash.channels.dineIn'), ...d.channels.data!.dine_in },
                { icon: ShoppingBag, label: t('dash.channels.pickup'), ...d.channels.data!.pickup },
              ].map((row) => (
                <li key={row.label} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <row.icon className="size-3.5 text-muted-foreground" /> {row.label}
                    </span>
                    <span className="font-semibold tabular-nums">{formatMoney(row.total)}</span>
                  </div>
                  <Meter value={row.total} max={Math.max(d.channels.data!.dine_in.total, d.channels.data!.pickup.total)} />
                  <span className="text-[12px] text-muted-foreground">{t('dash.orders', { count: row.count })}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('daySummary.highlights')}>
          {d.summary.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <dl className="flex flex-col gap-4 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Trophy className="size-3.5" /> {t('daySummary.topProduct')}</dt>
                <dd className="mt-0.5 font-semibold">{s?.top_product ? `${s.top_product.name} · ${t('dash.units', { count: toNumber(s.top_product.sold) })}` : '—'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Utensils className="size-3.5" /> {t('daySummary.topWaiter')}</dt>
                <dd className="mt-0.5 font-semibold">{s?.top_waiter_by_sales ? `${s.top_waiter_by_sales.name} · ${formatMoney(s.top_waiter_by_sales.total)}` : '—'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><XCircle className="size-3.5" /> {t('daySummary.cancelledLabel')}</dt>
                <dd className="mt-0.5 font-semibold">{toNumber(s?.cancelled)}</dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>

      <Panel
        flush
        title={t('daySummary.shifts')}
        description={t('daySummary.shiftsHint')}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/shifts">
              <History /> {t('daySummary.allShifts')}
            </Link>
          </Button>
        }
      >
        {d.shifts.isLoading ? (
          <div className="px-5 pb-5"><Skeleton className="h-16 w-full" /></div>
        ) : d.shifts.isError ? (
          <ErrorState error={d.shifts.error} onRetry={() => void d.shifts.refetch()} className="py-6" />
        ) : !d.shifts.data?.length ? (
          <EmptyState icon={History} title={t('daySummary.noShifts')} className="py-8" />
        ) : (
          <ul className="divide-y border-t">
            {d.shifts.data.map((sh) => {
              const diff = toNumber(sh.difference)
              const even = Math.abs(diff) < 0.005
              return (
                <li key={sh.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium tabular-nums">
                      {formatTime(sh.opened_at)}
                      {sh.closed_at ? ` – ${formatTime(sh.closed_at)}` : ''}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">{t('daySummary.openedBy', { name: who(sh.openedBy) })}</p>
                  </div>
                  {sh.status === 'open' ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium"><span className="size-2 animate-pulse rounded-full bg-success" /> {t('daySummary.open')}</span>
                  ) : (
                    <span className={cn('text-sm font-semibold tabular-nums', even ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-warning')}>
                      {even ? t('daySummary.even') : `${diff > 0 ? '+' : '−'}${formatMoney(Math.abs(diff))}`}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </Page>
  )
}
