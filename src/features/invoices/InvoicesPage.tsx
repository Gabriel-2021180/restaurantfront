import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, ChevronLeft, ChevronRight, FileText, LoaderCircle, Printer, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { InvoiceTicket, type InvoiceFull } from '@/features/print/InvoiceTicket'
import { printTicket } from '@/features/print/print'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader, Panel } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import api, { getErrorMessage } from '@/lib/api/client'
import { presetRange, type DateRange } from '@/lib/date-range'
import { formatDate, formatMoney, formatTime, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

interface InvoiceRow {
  id: string
  invoice_number: number | string
  client_name: string | null
  client_nit: string | null
  transaction_date: string
  total_amount: number | string
  is_annulled: boolean
  annulment_reason?: string | null
  payment_method?: string | null
  order_identifier?: string | null
}
interface Paged {
  data: InvoiceRow[]
  meta: { total: number; page: number; limit: number; last_page: number }
}
type Kind = 'all' | 'dine_in' | 'pickup'

const LIMIT = 20

function useInvoices(range: DateRange, kind: Kind, page: number) {
  return useQuery({
    queryKey: ['finance', 'invoices', range, kind, page],
    queryFn: async () =>
      (await api.get<Paged>('/finance/invoices', { params: { from: range.from, to: range.to, page, limit: LIMIT, ...(kind === 'all' ? {} : { type: kind }) } })).data,
    placeholderData: keepPreviousData,
  })
}

/** Detalle con el ticket tal como sale impreso; desde aquí se reimprime o se anula. */
function InvoiceDetail({ id, canVoid, onClose }: { id: string; canVoid: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const detail = useQuery({ queryKey: ['finance', 'invoices', id], queryFn: async () => (await api.get<InvoiceRow & InvoiceFull>(`/finance/invoices/${id}`)).data })
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inv = detail.data

  const voidMutation = useMutation({
    mutationFn: async () => (await api.post(`/finance/invoices/${id}/void`, { reason: reason.trim() })).data,
    onSuccess: () => {
      toast.success(t('invoicesPage.voided', { n: inv?.invoice_number }))
      void qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      void qc.invalidateQueries({ queryKey: ['finance', 'report-daily'] })
      setVoiding(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  async function submitVoid() {
    const r = reason.trim()
    if (r.length < 5) return setError(t('invoicesPage.void.reasonShort'))
    setError(null)
    const ok = await confirm({
      title: t('invoicesPage.void.confirmTitle', { n: inv?.invoice_number }),
      description: t('invoicesPage.void.confirmText', { total: formatMoney(inv?.total_amount) }),
      confirmText: t('invoicesPage.void.confirm'),
      tone: 'danger',
    })
    if (ok) voidMutation.mutate()
  }

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !voidMutation.isPending && onClose()}
      title={inv ? t('invoicesPage.detailTitle', { n: inv.invoice_number }) : t('invoicesPage.title')}
      description={inv ? `${formatDate(inv.transaction_date)} · ${formatTime(inv.transaction_date)}` : undefined}
      className="sm:max-w-md"
      footer={
        inv &&
        !voiding && (
          <>
            {canVoid && !inv.is_annulled && (
              <Button variant="ghost" className="h-11 text-destructive sm:mr-auto" onClick={() => setVoiding(true)}>
                <Ban /> {t('invoicesPage.void.action')}
              </Button>
            )}
            <Button variant="outline" className="h-11" onClick={() => inv && void printTicket(<InvoiceTicket invoice={inv} />)}>
              <Printer /> {t('invoicesPage.print')}
            </Button>
          </>
        )
      }
    >
      {detail.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : detail.isError ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : voiding ? (
        <div className="flex flex-col gap-4 pt-1">
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm">{t('invoicesPage.void.warning')}</p>
          <div className="grid gap-2">
            <Label htmlFor="void-reason">{t('invoicesPage.void.reason')}</Label>
            <Textarea id="void-reason" rows={3} maxLength={500} autoFocus value={reason} onChange={(e) => { setReason(e.target.value); setError(null) }} placeholder={t('invoicesPage.void.reasonPlaceholder')} aria-invalid={!!error} />
            {error ? <p className="text-[13px] text-destructive">{error}</p> : <p className="text-[13px] text-muted-foreground">{t('invoicesPage.void.reasonHint')}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11" onClick={() => setVoiding(false)} disabled={voidMutation.isPending}>{t('reservationsPage.form.cancel')}</Button>
            <Button variant="destructive" className="h-11" onClick={() => void submitVoid()} disabled={voidMutation.isPending}>
              {voidMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Ban />} {t('invoicesPage.void.confirm')}
            </Button>
          </div>
        </div>
      ) : (
        inv && (
          <div className="flex flex-col gap-4">
            {inv.is_annulled && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm">
                <span className="font-medium text-destructive">{t('invoicesPage.annulled')}</span>
                {inv.annulment_reason && <span className="block text-muted-foreground">{inv.annulment_reason}</span>}
              </p>
            )}
            <div className="overflow-hidden rounded-lg border bg-white">
              <InvoiceTicket invoice={inv} />
            </div>
          </div>
        )
      )}
    </ResponsivePanel>
  )
}

export default function InvoicesPage() {
  const { t } = useTranslation()
  const { hasRole } = useAuth()
  const canVoid = hasRole(['admin'])
  const [range, setRange] = useState<DateRange>(() => presetRange('today'))
  const [kind, setKind] = useState<Kind>('all')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const list = useInvoices(range, kind, page)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const data = list.data?.data ?? []
    if (!q) return data
    return data.filter((i) => [i.client_name, i.client_nit, String(i.invoice_number), i.order_identifier].some((v) => v && String(v).toLowerCase().includes(q)))
  }, [list.data, query])
  const meta = list.data?.meta
  const pageTotal = rows.filter((r) => !r.is_annulled).reduce((s, r) => s + toNumber(r.total_amount), 0)

  const change = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  return (
    <Page>
      <PageHeader title={t('invoicesPage.title')} description={meta ? t('invoicesPage.summary', { count: meta.total }) : ' '} />
      <DateRangePicker value={range} onChange={change(setRange)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterChips<Kind>
          label={t('invoicesPage.title')}
          value={kind}
          onChange={change(setKind)}
          options={[
            { value: 'all', label: t('tablesPage.filter.all') },
            { value: 'dine_in', label: t('dash.channels.dineIn') },
            { value: 'pickup', label: t('dash.channels.pickup') },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('invoicesPage.search')} aria-label={t('invoicesPage.search')} className="h-10 pr-9 pl-9" />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground" aria-label={t('tablesPage.clearSearch')}>
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <Panel flush>
        {list.isLoading ? (
          <ul className="divide-y" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4"><div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-60" /></div><Skeleton className="h-5 w-20" /></li>
            ))}
          </ul>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title={query ? t('inventoryPage.noMatch') : t('invoicesPage.empty')} description={!query ? t('invoicesPage.emptyHint') : undefined} />
        ) : (
          <>
            <ul className={cn('stagger-in divide-y', list.isFetching && 'opacity-70 transition-opacity')}>
              {rows.map((inv) => (
                <li key={inv.id}>
                  <button type="button" onClick={() => setOpenId(inv.id)} className="flex w-full cursor-pointer items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-secondary">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="text-[13px] text-muted-foreground tabular-nums">#{inv.invoice_number}</span>
                        <span className={cn('truncate font-medium', inv.is_annulled && 'text-muted-foreground line-through')}>{inv.client_name || t('invoicesPage.noName')}</span>
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {[inv.order_identifier, inv.client_nit && `NIT ${inv.client_nit}`, `${formatDate(inv.transaction_date)} ${formatTime(inv.transaction_date)}`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-semibold tabular-nums', inv.is_annulled && 'text-muted-foreground line-through')}>{formatMoney(inv.total_amount)}</p>
                      {inv.is_annulled ? (
                        <p className="text-[12px] font-medium text-destructive">{t('invoicesPage.annulled')}</p>
                      ) : (
                        inv.payment_method && <p className="text-[12px] text-muted-foreground">{t(`dash.method.${inv.payment_method}`, { defaultValue: inv.payment_method })}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm">
              <span className="text-muted-foreground">{t('invoicesPage.pageTotal', { total: formatMoney(pageTotal) })}</span>
              {meta && meta.last_page > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="size-9" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t('reservationsPage.prev')}><ChevronLeft /></Button>
                  <span className="tabular-nums">{t('invoicesPage.page', { page, pages: meta.last_page })}</span>
                  <Button variant="outline" size="icon" className="size-9" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} aria-label={t('reservationsPage.nextDay')}><ChevronRight /></Button>
                </div>
              )}
            </div>
          </>
        )}
      </Panel>

      {openId && <InvoiceDetail id={openId} canVoid={canVoid} onClose={() => setOpenId(null)} />}
    </Page>
  )
}
