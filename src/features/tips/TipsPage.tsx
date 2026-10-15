import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Coins, HandCoins, LoaderCircle, Receipt, Smile, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import { MoneyInput } from '@/components/forms/MoneyInput'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader, Panel, Stat, StatGrid } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import api, { getErrorMessage } from '@/lib/api/client'
import { formatDate, formatMoney, formatTime, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type Period = 'day' | 'week' | 'month'
type TableRef = string | number | { table_number?: string | number } | null | undefined
interface TipStats {
  stats: { total_money: number; tables_served?: number; tables_with_tip?: number; tables_without_tip?: number } | null
  history: { id: string; amount: number; note?: string | null; table?: TableRef; date: string; was_zero?: boolean }[]
}
interface PendingOrder {
  id: string
  order_number?: number
  table?: TableRef
  total: number
}

const tableLabel = (t: TableRef) => (t == null ? '' : typeof t === 'object' ? String(t.table_number ?? '') : String(t))

function TipDialog({ order, onClose }: { order: PendingOrder; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const save = useMutation({
    mutationFn: async () => (await api.post('/users/tips', { order_id: order.id, amount: toNumber(amount), note: note.trim() || undefined })).data,
    onSuccess: () => {
      toast.success(toNumber(amount) > 0 ? t('tipsPage2.saved', { amount: formatMoney(amount) }) : t('tipsPage2.savedZero'))
      void qc.invalidateQueries({ queryKey: ['tips'] })
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }
  const table = tableLabel(order.table)

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !save.isPending && onClose()}
      title={table ? t('order.table', { n: table }) : t('tipsPage2.order', { n: order.order_number ?? '' })}
      description={t('tipsPage2.billed', { total: formatMoney(order.total) })}
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={save.isPending}>{t('reservationsPage.form.cancel')}</Button>
          <Button type="submit" form="tip-form" className="h-11" disabled={save.isPending}>
            {save.isPending && <LoaderCircle className="animate-spin" />} {toNumber(amount) > 0 ? t('tipsPage2.save') : t('tipsPage2.saveZero')}
          </Button>
        </>
      }
    >
      <form id="tip-form" onSubmit={submit} className="flex flex-col gap-5 pt-1">
        <div className="grid gap-2">
          <Label htmlFor="tip-amount">{t('tipsPage2.amount')}</Label>
          <MoneyInput id="tip-amount" value={amount} onValueChange={setAmount} autoFocus />
          <div className="flex flex-wrap gap-1.5">
            {[5, 10, 20, 50].map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className={cn('h-9 cursor-pointer rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-secondary', toNumber(amount) === v && 'border-foreground/40 bg-primary-soft')}>
                Bs {v}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tip-note">{t('tipsPage2.note')}</Label>
          <Input id="tip-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={t('tipsPage2.notePlaceholder')} />
        </div>
      </form>
    </ResponsivePanel>
  )
}

/** Solo el propio mesero ve sus propinas (matriz de roles aprobada). */
export default function TipsPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('day')
  const [open, setOpen] = useState<PendingOrder | null>(null)
  const stats = useQuery({ queryKey: ['tips', 'stats', period], queryFn: async () => (await api.get<TipStats>('/users/tips', { params: { period } })).data })
  const pending = useQuery({
    queryKey: ['tips', 'pending'],
    queryFn: async () => {
      const d = (await api.get<PendingOrder[]>('/orders', { params: { status: 'completed', pending_tip: true } })).data
      return Array.isArray(d) ? d : []
    },
    refetchInterval: 60_000,
  })
  const s = stats.data?.stats

  return (
    <Page width="narrow">
      <PageHeader title={t('tipsPage2.title')} description={t('tipsPage2.subtitle')} />
      <FilterChips<Period>
        label={t('tipsPage2.title')}
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'day', label: t('reservationsPage.today') },
          { value: 'week', label: t('tipsPage2.week') },
          { value: 'month', label: t('tipsPage2.month') },
        ]}
      />
      {stats.isError ? (
        <Panel><ErrorState error={stats.error} onRetry={() => void stats.refetch()} className="py-6" /></Panel>
      ) : (
        <StatGrid className="lg:grid-cols-3">
          <Stat icon={Coins} label={t('tipsPage2.total')} value={formatMoney(s?.total_money)} loading={stats.isLoading} />
          <Stat icon={Utensils} label={t('tipsPage2.tables')} value={toNumber(s?.tables_served)} loading={stats.isLoading} />
          <Stat icon={Smile} label={t('tipsPage2.withTip')} value={`${toNumber(s?.tables_with_tip)} / ${toNumber(s?.tables_served)}`} loading={stats.isLoading} />
        </StatGrid>
      )}

      <Panel flush title={t('tipsPage2.pending')} description={t('tipsPage2.pendingHint')}>
        {pending.isLoading ? (
          <div className="px-5 pb-5"><Skeleton className="h-16 w-full" /></div>
        ) : pending.isError ? (
          <ErrorState error={pending.error} onRetry={() => void pending.refetch()} className="py-6" />
        ) : !pending.data?.length ? (
          <EmptyState icon={HandCoins} title={t('tipsPage2.noPending')} className="py-8" />
        ) : (
          <ul className="divide-y border-t">
            {pending.data.map((o) => (
              <li key={o.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{tableLabel(o.table) ? t('order.table', { n: tableLabel(o.table) }) : t('tipsPage2.order', { n: o.order_number ?? '' })}</p>
                  <p className="text-[13px] text-muted-foreground">{t('tipsPage2.billed', { total: formatMoney(o.total) })}</p>
                </div>
                <Button size="sm" onClick={() => setOpen(o)}><HandCoins /> {t('tipsPage2.register')}</Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel flush title={t('tipsPage2.history')}>
        {stats.isLoading ? (
          <div className="px-5 pb-5"><Skeleton className="h-24 w-full" /></div>
        ) : !stats.data?.history?.length ? (
          <EmptyState icon={Receipt} title={t('tipsPage2.noHistory')} className="py-8" />
        ) : (
          <ul className="divide-y border-t">
            {stats.data.history.map((h) => (
              <li key={h.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{tableLabel(h.table) ? t('order.table', { n: tableLabel(h.table) }) : '—'}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{[`${formatDate(h.date)} ${formatTime(h.date)}`, h.note].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={cn('font-semibold tabular-nums', (h.was_zero || !toNumber(h.amount)) && 'text-muted-foreground')}>{toNumber(h.amount) ? formatMoney(h.amount) : t('tipsPage2.none')}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {open && <TipDialog order={open} onClose={() => setOpen(null)} />}
    </Page>
  )
}
