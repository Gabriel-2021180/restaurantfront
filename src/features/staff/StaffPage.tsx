import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Award, Coins, Receipt, Users } from 'lucide-react'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { EmptyState, ErrorState, FilterChips, Meter, Page, PageHeader, Panel, Stat, StatGrid } from '@/components/page'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api/client'
import { AuditLog } from '@/features/audit/AuditLog'
import { presetRange, type DateRange } from '@/lib/date-range'
import { formatMoney, toNumber } from '@/lib/format'
import { initials } from '@/lib/roles'

interface Series {
  labels: string[]
  series: (number | string)[]
}
interface Visual {
  cards: { total_sales: number | string; total_orders: number | string; top_employee: string }
  charts: { waiters: Series; payments: Series }
}
interface Team {
  waiters: { full_name: string; tables_served: number; sales_generated: string | number }[]
  cashiers: { full_name: string; invoices: number; collected: string | number; pickups_handled: number }[]
  admins: { full_name: string; pickups_created: number; pickup_sales: string | number }[]
}
type Role = keyof Team

const opts = { placeholderData: keepPreviousData, staleTime: 60_000 } as const
const zip = (s?: Series) => (s?.labels ?? []).map((name, i) => ({ name, value: toNumber(s?.series?.[i]) }))

export default function StaffPage() {
  const { t } = useTranslation()
  const [range, setRange] = useState<DateRange>(() => presetRange('month'))
  const [role, setRole] = useState<Role>('waiters')
  const p = { from: range.from, to: range.to }

  const visual = useQuery({ queryKey: ['analytics', 'staff-visual', p], queryFn: async () => (await api.get<Visual>('/analytics/dashboard-visual', { params: p })).data, ...opts })
  const team = useQuery({ queryKey: ['analytics', 'staff-team', p], queryFn: async () => (await api.get<Team>('/analytics/performance-global', { params: p })).data, ...opts })

  const waiters = zip(visual.data?.charts.waiters).sort((a, b) => b.value - a.value)
  const payments = zip(visual.data?.charts.payments).sort((a, b) => b.value - a.value)
  const best = waiters[0]
  const members = team.data?.[role] ?? []

  return (
    <Page width="wide">
      <PageHeader title={t('staffPage.title')} description={t('staffPage.subtitle')} />
      <DateRangePicker value={range} onChange={setRange} />

      {visual.isError ? (
        <Panel><ErrorState error={visual.error} onRetry={() => void visual.refetch()} className="py-6" /></Panel>
      ) : (
        <StatGrid className="lg:grid-cols-3">
          <Stat icon={Coins} label={t('staffPage.sales')} value={formatMoney(visual.data?.cards.total_sales)} loading={visual.isLoading} />
          <Stat icon={Receipt} label={t('staffPage.orders')} value={toNumber(visual.data?.cards.total_orders)} loading={visual.isLoading} />
          <Stat icon={Award} label={t('staffPage.star')} value={best?.name ?? '—'} hint={best ? formatMoney(best.value) : undefined} loading={visual.isLoading} />
        </StatGrid>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title={t('staffPage.ranking')} description={t('staffPage.rankingHint')}>
          {visual.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : waiters.length === 0 ? (
            <EmptyState icon={Users} title={t('staffPage.noSales')} className="py-8" />
          ) : (
            <ol className="flex flex-col gap-3.5">
              {waiters.map((w, i) => (
                <li key={w.name} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
                  <span className="row-span-2 grid size-8 place-items-center rounded-full bg-secondary text-[12px] font-semibold">{initials(w.name)}</span>
                  <span className="truncate text-sm font-medium">
                    {w.name}
                    {i === 0 && <Award className="ml-1.5 inline size-3.5 text-[var(--brand)]" aria-label={t('staffPage.star')} />}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(w.value)}</span>
                  <Meter value={w.value} max={waiters[0].value} className="col-span-2" />
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title={t('staffPage.payments')} description={t('staffPage.paymentsHint')}>
          {visual.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : payments.length === 0 ? (
            <EmptyState icon={Receipt} title={t('staffPage.noPayments')} className="py-8" />
          ) : (
            <ul className="flex flex-col gap-3.5">
              {payments.map((m) => (
                <li key={m.name} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{t(`dash.method.${m.name}`, { defaultValue: m.name })}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(m.value)}</span>
                  </div>
                  <Meter value={m.value} max={payments[0].value} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          flush
          className="lg:col-span-2"
          title={t('staffPage.team')}
          action={
            <FilterChips<Role>
              label={t('staffPage.team')}
              value={role}
              onChange={setRole}
              className="mx-0 px-0"
              options={[
                { value: 'waiters', label: t('staffPage.roles.waiters'), count: team.data?.waiters.length },
                { value: 'cashiers', label: t('staffPage.roles.cashiers'), count: team.data?.cashiers.length },
                { value: 'admins', label: t('staffPage.roles.admins'), count: team.data?.admins.length },
              ]}
            />
          }
        >
          {team.isLoading ? (
            <div className="px-5 pb-5"><Skeleton className="h-40 w-full" /></div>
          ) : team.isError ? (
            <ErrorState error={team.error} onRetry={() => void team.refetch()} className="py-8" />
          ) : members.length === 0 ? (
            <EmptyState icon={Users} title={t('staffPage.noMembers')} className="py-8" />
          ) : (
            <ul className="divide-y border-t">
              {members.map((m) => {
                const stats =
                  role === 'waiters'
                    ? [
                        { label: t('staffPage.m.tables'), value: toNumber((m as Team['waiters'][number]).tables_served) },
                        { label: t('staffPage.m.sales'), value: formatMoney((m as Team['waiters'][number]).sales_generated) },
                      ]
                    : role === 'cashiers'
                      ? [
                          { label: t('staffPage.m.invoices'), value: toNumber((m as Team['cashiers'][number]).invoices) },
                          { label: t('staffPage.m.pickups'), value: toNumber((m as Team['cashiers'][number]).pickups_handled) },
                          { label: t('staffPage.m.collected'), value: formatMoney((m as Team['cashiers'][number]).collected) },
                        ]
                      : [
                          { label: t('staffPage.m.pickupsCreated'), value: toNumber((m as Team['admins'][number]).pickups_created) },
                          { label: t('staffPage.m.pickupSales'), value: formatMoney((m as Team['admins'][number]).pickup_sales) },
                        ]
                return (
                  <li key={m.full_name} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[12px] font-semibold">{initials(m.full_name)}</span>
                      <span className="truncate font-medium">{m.full_name}</span>
                    </div>
                    <dl className="flex gap-6">
                      {stats.map((s) => (
                        <div key={s.label} className="text-right">
                          <dt className="text-[12px] text-muted-foreground">{s.label}</dt>
                          <dd className="text-sm font-semibold tabular-nums">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <AuditLog range={range} />
    </Page>
  )
}
