import { isSent } from '@/features/orders/utils'
import type { Order } from '@/types/order'
import type { DiningTable } from './api'

export type TileState = 'free' | 'occupied' | 'ready' | 'billing' | 'reserved'

/** Un solo lugar define cómo se ve cada estado: línea superior, punto y texto. */
export const STATE_STYLE: Record<TileState, { line: string; dot: string; text: string }> = {
  // Neutros: lo normal no compite por atención.
  free: { line: 'bg-transparent', dot: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
  occupied: { line: 'bg-foreground/25', dot: 'bg-foreground/70', text: 'text-foreground' },
  reserved: { line: 'bg-info/50', dot: 'border border-info bg-transparent', text: 'text-info' },
  // Con color solo lo que pide una acción del mesero o del cajero.
  ready: { line: 'bg-success', dot: 'bg-success animate-pulse', text: 'text-success' },
  billing: { line: 'bg-warning', dot: 'bg-warning', text: 'text-warning' },
}

export function tileState(table: DiningTable, order: Order | undefined): TileState {
  if (table.status === 'reserved') return 'reserved'
  if (table.status !== 'occupied') return 'free'
  if (order?.status === 'pending_payment') return 'billing'
  if (order?.status === 'ready' || order?.details.some((d) => d.ready_at && isSent(d))) return 'ready'
  return 'occupied'
}

export const waiterName = (o?: Order | null) => o?.waiter?.first_names?.split(' ')[0] ?? null
