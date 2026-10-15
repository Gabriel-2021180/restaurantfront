export type PayMethod = 'EFECTIVO' | 'QR' | 'TARJETA'

export interface CashStatus {
  session_id: string
  opened_at: string
  opened_by: string | null
  starting_cash: number
  sales: { cash: number; qr: number; card: number; total: number }
  expected_in_drawer: number
  expected: { cash: number; qr: number; card: number; total: number }
}

export interface CashSession {
  id: string
  opened_at: string
  closed_at: string | null
  starting_cash: number
  closing_cash_count: number | null
  difference: number | null
  status: 'open' | 'closed'
  notes: string | null
  openedBy: { first_names?: string; last_names?: string } | null
  closedBy: { first_names?: string; last_names?: string } | null
  breakdown: { method: PayMethod; expected: number; counted: number | null; difference: number | null }[] | null
}

export interface OrderBilling {
  order_id: string
  status: string
  split_mode: 'none' | 'items' | 'amount'
  total: number
  billed: number
  pending: number
  items: { detail_id: string; product: string; quantity: number; billed_quantity: number; unit_price: number; subtotal: number }[]
  invoices: { id: string; invoice_number: string; total: number; is_annulled: boolean }[]
}

export interface InvoiceCreated {
  id: string
  invoice_number: string
  total: number
  client: string
  payment_method: string
  payments: { method: PayMethod; amount: number }[]
  amount_received: number | null
  change: number | null
  pending: number
  table_id: string | null
}

export interface CreateInvoiceInput {
  order_id: string
  client_nit?: string
  client_name?: string
  payment_method?: PayMethod | 'MIXTO'
  payments?: { method: PayMethod; amount: number }[]
  amount_received?: number
  items?: { detail_id: string; quantity: number }[]
  amount?: number
}

export interface DaySummary {
  date: string
  total_sales: number
  orders_count: number
  average_ticket: number
  top_product: { name: string; sold: number } | null
  peak_hour: string | null
  top_waiter_by_sales: { name: string; total: number } | null
}
