import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChefHat, CircleCheck, LoaderCircle, Receipt, Tag, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/order'
import { groupSent, isSent, orderSummary, type LineGroup } from './utils'

interface Props {
  order: Order
  busy: { send: boolean; bill: boolean; code: boolean }
  onRemove: (detailId: string) => void
  onSend: () => void
  onRequestBill: () => void
  onApplyCode: (code: string) => Promise<boolean>
  onRemovePromotion: (promotionId: string) => void
}

function Line({ group, removable, onRemove }: { group: LineGroup; removable: boolean; onRemove: (id: string) => void }) {
  const { t } = useTranslation()
  const { line, children } = group
  const discount = Number(line.discount_amount || 0)
  return (
    <li className="flex gap-3 py-2.5">
      <span className="w-7 shrink-0 pt-px text-right font-semibold tabular-nums">{line.quantity}×</span>
      <div className="min-w-0 flex-1">
        <p className="leading-snug font-medium">{line.name ?? line.product?.name}</p>
        {children.length > 0 && (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{children.map((c) => `${c.quantity} ${c.name ?? c.product?.name ?? ""}`).join(' · ')}</p>
        )}
        {line.notes && !line.promotion_id && <p className="mt-0.5 text-[13px] text-warning">{line.notes}</p>}
        {discount > 0 && <p className="mt-0.5 text-[13px] text-success">-{formatMoney(discount)}</p>}
      </div>
      <span className="shrink-0 pt-px tabular-nums">{formatMoney(line.subtotal ?? line.price_at_purchase * line.quantity)}</span>
      {removable && (
        <button
          type="button"
          onClick={() => onRemove(line.id)}
          aria-label={`${t('order.remove')}: ${line.name ?? line.product?.name ?? ""}`}
          className="-my-1 -mr-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  )
}

export function TicketPanel({ order, busy, onRemove, onSend, onRequestBill, onApplyCode, onRemovePromotion }: Props) {
  const { t, i18n } = useTranslation()
  const [code, setCode] = useState('')
  const s = orderSummary(order)
  const empty = s.pending.length === 0 && s.batches.length === 0

  async function submitCode(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    if (await onApplyCode(code.trim().toUpperCase())) setCode('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        {empty && <p className="py-10 text-center text-sm text-muted-foreground">{t('order.emptyTicket')}</p>}

        {s.pending.length > 0 && (
          <section className="pt-3">
            <h3 className="flex items-center gap-2 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" /> {t('order.pending')}
            </h3>
            <ul className="divide-y">
              {s.pending.map((g) => (
                <Line key={g.line.id} group={g} removable onRemove={onRemove} />
              ))}
            </ul>
          </section>
        )}

        {s.batches.map(([n, groups]) => {
          const lines = groups.flatMap((g) => (g.children.length ? g.children : [g.line]))
          const ready = lines.length > 0 && lines.every((l) => l.ready_at)
          const sentAt = lines.find(isSent)?.printed_at
          return (
            <section key={n} className="border-t pt-3 first:border-t-0">
              <h3 className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{t('order.inKitchen', { n })}{sentAt && ` · ${formatTime(sentAt, i18n.language)}`}</span>
                <span className={cn('inline-flex items-center gap-1 font-medium', ready ? 'text-success' : 'text-warning')}>
                  {ready ? <CircleCheck className="size-3.5" /> : <ChefHat className="size-3.5" />}
                  {ready ? t('order.ready') : t('order.cooking')}
                </span>
              </h3>
              <ul className="divide-y">
                {groups.map((g) => (
                  <Line key={g.line.id} group={g} removable={!groupSent(g)} onRemove={onRemove} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 border-t bg-card px-4 pt-3 pb-4">
        <form onSubmit={submitCode} className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder={t('order.promoCode')}
              className="pl-9 font-medium tracking-wide"
              aria-label={t('order.promoCode')}
            />
          </div>
          <Button type="submit" variant="outline" disabled={!code.trim() || busy.code}>
            {busy.code && <LoaderCircle className="animate-spin" />} {t('order.apply')}
          </Button>
        </form>
        {(order.promotions?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {order.promotions?.map((p) => (
              <span key={p.id} className="inline-flex h-8 items-center gap-1 rounded-full bg-success/12 pr-1 pl-3 text-[13px] font-medium text-success">
                {p.code ?? p.name}
                <button
                  type="button"
                  onClick={() => onRemovePromotion(p.id)}
                  aria-label={t('order.removeCode')}
                  className="grid size-6 cursor-pointer place-items-center rounded-full hover:bg-success/15"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <dl className="flex flex-col gap-1 text-sm">
          {s.discounts > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <dt>{t('order.subtotal')}</dt>
                <dd className="tabular-nums">{formatMoney(s.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-success">
                <dt>{t('order.discounts')}</dt>
                <dd className="tabular-nums">-{formatMoney(s.discounts)}</dd>
              </div>
            </>
          )}
          <div className="flex items-baseline justify-between">
            <dt className="font-medium">{t('order.total')}</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">{formatMoney(order.total)}</dd>
          </div>
        </dl>

        {/* Mismo ancho y alto para ambas acciones; sin nada nuevo, enviar queda como acción secundaria. */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant={s.pendingUnits ? 'default' : 'outline'} className="min-w-0" onClick={onSend} disabled={s.pendingUnits === 0 || busy.send}>
            {busy.send ? <LoaderCircle className="animate-spin" /> : <ChefHat />}
            {s.pendingUnits ? t('order.sendN', { n: s.pendingUnits }) : t('order.sendToKitchen')}
          </Button>
          <Button size="lg" variant="outline" className="min-w-0" onClick={onRequestBill} disabled={empty || busy.bill} aria-label={t('order.requestBill')}>
            {busy.bill ? <LoaderCircle className="animate-spin" /> : <Receipt />}
            <span className="truncate">{t('order.requestBill')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
