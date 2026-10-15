export type ReservationStatus = 'pending' | 'seated' | 'completed' | 'cancelled' | 'no_show'

export interface Reservation {
  id: string
  table: { id: string; number: string } | null
  customer_name: string
  customer_phone: string | null
  party_size: number
  reserved_at: string
  duration_min: number
  ends_at: string
  notes: string | null
  status: ReservationStatus
  seated_order_id: string | null
  created_by: { id: string; name: string } | null
  created_at: string
  updated_at: string
}

export interface ReservationInput {
  table_id: string | null
  customer_name: string
  customer_phone?: string | null
  party_size: number
  reserved_at: string
  duration_min: number
  notes?: string | null
}
