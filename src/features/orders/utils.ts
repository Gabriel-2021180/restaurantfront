import type { Product } from '@/types/menu'
import type { Order, OrderLine } from '@/types/order'

export const isSoldOut = (p: Product) => !p.is_active || (p.track_stock && Number(p.stock) <= 0)

export const isSent = (l: OrderLine) => l.is_printed || Boolean(l.printed_at)

export interface LineGroup {
  line: OrderLine
  children: OrderLine[]
}

/** Agrupa las líneas: cada combo con sus platos hijos debajo. */
export function groupLines(lines: OrderLine[]): LineGroup[] {
  const children = new Map<string, OrderLine[]>()
  for (const l of lines) if (l.parent_detail_id) children.set(l.parent_detail_id, [...(children.get(l.parent_detail_id) ?? []), l])
  return lines.filter((l) => !l.parent_detail_id).map((line) => ({ line, children: children.get(line.id) ?? [] }))
}

/** Una línea padre (combo) cuenta como enviada si sus hijos lo están. */
export const groupSent = (g: LineGroup) => (g.children.length ? g.children.every(isSent) : isSent(g.line))

export function orderSummary(order: Order) {
  const groups = groupLines(order.details)
  const pending = groups.filter((g) => !groupSent(g))
  const batches = new Map<number, LineGroup[]>()
  for (const g of groups.filter(groupSent)) {
    const n = g.children[0]?.batch_number ?? g.line.batch_number
    batches.set(n, [...(batches.get(n) ?? []), g])
  }
  const discounts = order.details.reduce((s, d) => s + Number(d.discount_amount || 0), 0)
  const units = groups.reduce((s, g) => s + g.line.quantity, 0)
  return {
    pending,
    batches: [...batches.entries()].sort(([a], [b]) => b - a),
    discounts,
    subtotal: Number(order.total) + discounts,
    units,
    pendingUnits: pending.reduce((s, g) => s + g.line.quantity, 0),
  }
}

export const placeName = (o: Pick<Order, 'table' | 'client_name'>, t: (k: string, o?: Record<string, unknown>) => string) =>
  o.table ? t('order.table', { n: o.table.table_number }) : t('order.takeaway', { name: o.client_name ?? '' })
