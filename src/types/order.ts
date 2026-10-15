import type { Product } from './menu'

export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'in_process' | 'pending_payment' | 'billed' | 'completed' | 'cancelled' | 'merged'

export interface OrderLine {
  id: string
  order_id: string
  product_id: string | null
  name: string
  batch_number: number
  quantity: number
  price_at_purchase: number
  subtotal: number
  discount_amount: number
  notes: string | null
  is_printed: boolean
  printed_at: string | null
  ready_at: string | null
  promotion_id: string | null
  parent_detail_id: string | null
  promotion: { id: string; name: string; kind: 'bundle' | 'discount' } | null
  product: Product | null
  created_at: string
}

export interface OrderTable {
  id: string
  table_number: string | number
  capacity?: number
  status?: string
}

export interface Order {
  id: string
  status: OrderStatus
  order_type?: string
  table_id: string | null
  table: OrderTable | null
  client_name: string | null
  client_phone: string | null
  waiter_id: string | null
  waiter: { id: string; first_names?: string; last_names?: string } | null
  total: number
  details: OrderLine[]
  promotions: { id: string; name: string; code: string | null }[]
  created_at: string
}
