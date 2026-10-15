import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { UseQueryResult } from '@tanstack/react-query'
import { BarChart3, Clock, Coins, Percent, Receipt, ShoppingBag, TrendingUp, Utensils, Wallet } from 'lucide-react'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { EmptyState, ErrorState, Meter, Page, PageHeader, Panel, Stat, StatGrid } from '@/components/page'
import { ChartTooltip } from '@/components/page/chart'
import { CHART, axisProps } from '@/components/page/chart-theme'
import { Skeleton } from '@/components/ui/skeleton'
import { presetRange, type DateRange } from '@/lib/date-range'
import { formatMoney } from '@/lib/format'
import { useDashboard, type Ranked } from './api'
import { AttentionPanel } from './AttentionPanel'

const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k` : String(Math.round(v)))

/** Envuelve cada panel con su carga, error y vacío, para no repetirlo en cada uno. */
function Async<T>({ q, empty, height = 'h-56', children }: { q: UseQueryResult<T>; empty: (d: T) => boolean; height?: string; children: (d: T) => ReactNode }) {
  const { t } = useTranslation()
  if (q.isLoading) return <Skeleton className={`${height} w-full`} />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} className="py-8" />
  if (q.data === undefined || empty(q.data)) return <EmptyState icon={BarChart3} title={t('dash.empty')} description={t('dash.emptyHint')} className="py-8" />
  return <>{children(q.data)}</>
}

function Ranking({ rows, metric }: { rows: Ranked[]; metric: 'sold' | 'profit' }) {
  const { t } = useTranslation()
  // Se ordena aquí: el puesto y la barra tienen que decir lo mismo.
  rows = [...rows].sort((a, b) => Number(b[metric] ?? 0) - Number(a[metric] ?? 0))
  const max = Math.max(...rows.map((r) => Number(r[metric] ?? 0)))
  return (
    <ol className="flex flex-col gap-3.5">
      {rows.map((r, i) => (
        <li key={`${r.name}-${i}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
          <span className="text-[13px] text-muted-foreground tabular-nums">{i + 1}</span>
          <span className="truncate text-sm font-medium">{r.name}</span>
          <span className="text-sm font-semibold tabular-nums">{metric === 'profit' ? formatMoney(r.profit) : t('dash.units', { count: r.sold })}</span>
          <span />
          <Meter value={Number(r[metric] ?? 0)} max={max} className="col-span-2" />
        </li>
      ))}
    </ol>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [range, setRange] = useState<DateRange>(() => presetRange('month'))
  const d = useDashboard(range)
  const year = range.to.slice(0, 4)
  const k = d.kpis.data

  return (
    <Page width="wide">
      <PageHeader title={t('dash.title')} description={t('dash.subtitle')} />
      <AttentionPanel />
      <DateRangePicker value={range} onChange={setRange} />

      {d.kpis.isError ? (
        <Panel>
          <ErrorState error={d.kpis.error} onRetry={() => void d.kpis.refetch()} className="py-6" />
        </Panel>
      ) : (
        <StatGrid>
          <Stat icon={Coins} label={t('dash.kpi.sales')} value={formatMoney(k?.total_revenue)} loading={d.kpis.isLoading} />
          <Stat icon={Wallet} label={t('dash.kpi.profit')} value={formatMoney(k?.net_profit)} loading={d.kpis.isLoading} />
          <Stat icon={Receipt} label={t('dash.kpi.ticket')} value={formatMoney(k?.average_ticket)} loading={d.kpis.isLoading} />
          <Stat icon={Percent} label={t('dash.kpi.margin')} value={`${(k?.profit_margin ?? 0).toFixed(1)}%`} loading={d.kpis.isLoading} />
        </StatGrid>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title={t('dash.year.title', { year })} description={t('dash.year.subtitle', { year, prev: Number(year) - 1 })}>
          <Async q={d.year} empty={(rows) => rows.every((r) => !r.year_current && !r.year_past)} height="h-64">
            {(rows) => (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="month" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={compact} width={40} />
                      <Tooltip
                        cursor={{ fill: 'var(--secondary)' }}
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <ChartTooltip
                              title={label}
                              rows={[
                                { label: year, value: formatMoney(payload.find((x) => x.dataKey === 'year_current')?.value), color: CHART.ink },
                                { label: Number(year) - 1, value: formatMoney(payload.find((x) => x.dataKey === 'year_past')?.value), color: CHART.muted },
                              ]}
                            />
                          ) : null
                        }
                      />
                      <Bar dataKey="year_past" fill={CHART.muted} radius={[3, 3, 0, 0]} maxBarSize={14} />
                      <Bar dataKey="year_current" fill={CHART.ink} radius={[3, 3, 0, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 flex gap-4 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: CHART.ink }} /> {year}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: CHART.muted }} /> {Number(year) - 1}</span>
                </p>
              </>
            )}
          </Async>
        </Panel>

        <Panel title={t('dash.channels.title')} description={t('dash.channels.subtitle')}>
          <div className="flex flex-col gap-5">
            <Async q={d.channels} empty={(c) => !c.dine_in.count && !c.pickup.count} height="h-20">
              {(c) => {
                const max = Math.max(c.dine_in.total, c.pickup.total)
                return (
                  <ul className="flex flex-col gap-3.5">
                    {[
                      { icon: Utensils, label: t('dash.channels.dineIn'), ...c.dine_in },
                      { icon: ShoppingBag, label: t('dash.channels.pickup'), ...c.pickup },
                    ].map((row) => (
                      <li key={row.label} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <row.icon className="size-3.5 text-muted-foreground" /> {row.label}
                          </span>
                          <span className="font-semibold tabular-nums">{formatMoney(row.total)}</span>
                        </div>
                        <Meter value={row.total} max={max} />
                        <span className="text-[12px] text-muted-foreground">{t('dash.orders', { count: row.count })}</span>
                      </li>
                    ))}
                  </ul>
                )
              }}
            </Async>
            <div className="border-t pt-4">
              <p className="mb-3 text-[13px] font-medium text-muted-foreground">{t('dash.payments')}</p>
              <Async q={d.payments} empty={(rows) => rows.length === 0} height="h-20">
                {(rows) => (
                  <ul className="flex flex-col gap-2">
                    {rows.map((r) => (
                      <li key={r.method} className="flex items-baseline justify-between gap-2 text-sm">
                        <span>
                          {t(`dash.method.${r.method}`, { defaultValue: r.method })}
                          <span className="ml-1.5 text-[12px] text-muted-foreground">· {r.count}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatMoney(r.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Async>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('dash.top.title')} description={t('dash.top.subtitle')}>
          <Async q={d.topProducts} empty={(rows) => rows.length === 0}>
            {(rows) => <Ranking rows={rows} metric="sold" />}
          </Async>
        </Panel>
        <Panel title={t('dash.profit.title')} description={t('dash.profit.subtitle')}>
          <Async q={d.topProfitable} empty={(rows) => rows.length === 0}>
            {(rows) => <Ranking rows={rows} metric="profit" />}
          </Async>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t('dash.hours.title')} description={t('dash.hours.subtitle')} action={<Clock className="size-4 text-muted-foreground" />}>
          <Async q={d.peakHours} empty={(rows) => rows.every((r) => !r.orders_count)}>
            {(rows) => {
              const peak = Math.max(...rows.map((r) => r.orders_count))
              return (
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="hour" {...axisProps} interval="preserveStartEnd" />
                      <YAxis {...axisProps} allowDecimals={false} width={28} />
                      <Tooltip
                        cursor={{ fill: 'var(--secondary)' }}
                        content={({ active, payload, label }) =>
                          active && payload?.length ? <ChartTooltip title={label} rows={[{ label: t('dash.ordersLabel'), value: payload[0].value }]} /> : null
                        }
                      />
                      <Bar dataKey="orders_count" radius={[3, 3, 0, 0]} maxBarSize={22}>
                        {rows.map((r) => (
                          <Cell key={r.hour} fill={r.orders_count === peak ? CHART.brand : CHART.muted} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }}
          </Async>
        </Panel>
        <Panel title={t('dash.week.title')} description={t('dash.week.subtitle')} action={<TrendingUp className="size-4 text-muted-foreground" />}>
          <Async q={d.weekly} empty={(rows) => rows.every((r) => !r.average_sales)}>
            {(rows) => {
              const best = Math.max(...rows.map((r) => r.average_sales))
              return (
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={CHART.grid} />
                      <XAxis dataKey="day" {...axisProps} tickFormatter={(v: string) => v.slice(0, 3)} />
                      <YAxis {...axisProps} tickFormatter={compact} width={40} />
                      <Tooltip
                        cursor={{ fill: 'var(--secondary)' }}
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <ChartTooltip
                              title={label}
                              rows={[
                                { label: t('dash.avgSales'), value: formatMoney(payload[0].value) },
                                { label: t('dash.ordersLabel'), value: (payload[0].payload as { traffic: number }).traffic },
                              ]}
                            />
                          ) : null
                        }
                      />
                      <Bar dataKey="average_sales" radius={[3, 3, 0, 0]} maxBarSize={28}>
                        {rows.map((r) => (
                          <Cell key={r.day} fill={r.average_sales === best ? CHART.brand : CHART.muted} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }}
          </Async>
        </Panel>
      </div>
    </Page>
  )
}
