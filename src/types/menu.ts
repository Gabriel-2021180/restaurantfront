export interface Category {
  id: string
  name: string
  description?: string | null
}

export interface Product {
  id: string
  name: string
  description?: string | null
  image_url: string | null
  price: number
  is_active: boolean
  track_stock: boolean
  stock: number
  min_stock: number
  is_combo: boolean
  manually_disabled?: boolean
  category_id: string | null
  category?: Category | null
}

export type PromotionKind = 'bundle' | 'discount'
export type PricingType = 'fixed_price' | 'percent_off' | 'amount_off' | 'two_for_one'

export interface PromotionItem {
  product_id: string
  quantity: number
  product?: { id: string; name: string; price: number; image_url: string | null; is_active: boolean; deleted?: boolean }
}

export interface Promotion {
  id: string
  name: string
  code: string | null
  requires_code: boolean
  description: string | null
  image_url: string | null
  kind: PromotionKind
  pricing_type: PricingType
  value: number
  start_date: string | null
  end_date: string | null
  days_of_week: number[] | null
  start_time: string | null
  end_time: string | null
  max_uses: number | null
  uses: number
  is_active: boolean
  base_price?: number
  price?: number
  items: PromotionItem[]
  targets: { product_id?: string | null; category_id?: string | null; name: string }[]
}

/** Promoción vigente en este momento (GET /marketing/promotions/active). */
export interface ActivePromotion extends Promotion {
  price_preview?: number | null
  ends_at?: string | null
}
