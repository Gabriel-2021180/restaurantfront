/**
 * Datos de ejemplo del modo demo (solo desarrollo). Todo vive en memoria y se
 * reinicia al recargar. Los datos son ficticios.
 */
import type { User } from '@/types/auth'
import type { AppNotification } from '@/types/notification'

const now = () => new Date().toISOString()
let seq = 1000
export const nextId = () => String(++seq)

export const DEMO_PASSWORD = 'Demo1234'

const role = (slug: string, name: string) => ({ id: slug, slug, name })

export const users: User[] = [
  { id: 'u-owner', email: 'dueno@demo.bo', first_names: 'Carla', last_names: 'Vargas', role: role('super-admin', 'super-admin'), security_question: 'Ciudad natal' },
  { id: 'u-admin', email: 'admin@demo.bo', first_names: 'Ana', last_names: 'Quispe', role: role('admin', 'administrador'), security_question: 'Ciudad natal' },
  { id: 'u-waiter', email: 'mesero@demo.bo', first_names: 'Luis', last_names: 'Mamani', role: role('waiter', 'mesero'), security_question: 'Ciudad natal' },
  { id: 'u-cashier', email: 'cajero@demo.bo', first_names: 'Rosa', last_names: 'Flores', role: role('cashier', 'cajero'), security_question: 'Ciudad natal' },
  { id: 'u-chef', email: 'chef@demo.bo', first_names: 'Jorge', last_names: 'Condori', role: role('chef', 'cocinero'), security_question: 'Ciudad natal' },
  // Cuenta recién creada: entra con contraseña temporal y debe cambiarla.
  { id: 'u-new', email: 'nuevo@demo.bo', first_names: 'Marco', last_names: 'Rojas', role: role('waiter', 'mesero'), security_question: null, is_password_temporary: true },
]

export const categories = [
  { id: 'c-parrilla', name: 'Parrilla', description: 'Cortes a la brasa' },
  { id: 'c-platos', name: 'Platos típicos', description: '' },
  { id: 'c-bebidas', name: 'Bebidas', description: '' },
]

type Product = {
  id: string
  name: string
  price: number
  category_id: string
  category: { id: string; name: string }
  is_active: boolean
  track_stock: boolean
  stock: number
  min_stock: number
  image_url: string | null
  description: string
}

const product = (id: string, name: string, price: number, cat: string, extra: Partial<Product> = {}): Product => {
  const c = categories.find((x) => x.id === cat)!
  return { id, name, price, category_id: cat, category: { id: c.id, name: c.name }, is_active: true, track_stock: false, stock: 0, min_stock: 0, image_url: null, description: '', ...extra }
}

export const products: Product[] = [
  product('p-vacio', 'Vacío', 68, 'c-parrilla'),
  product('p-costilla', 'Costilla de res', 55, 'c-parrilla'),
  product('p-chorizo', 'Chorizo chuquisaqueño', 22, 'c-parrilla'),
  product('p-silpancho', 'Silpancho', 42, 'c-platos'),
  product('p-sajta', 'Sajta de pollo', 38, 'c-platos'),
  product('p-pique', 'Pique macho', 85, 'c-platos'),
  product('p-mocochinchi', 'Mocochinchi', 8, 'c-bebidas', { track_stock: true, stock: 24, min_stock: 6 }),
  product('p-paceña', 'Cerveza Paceña 620 ml', 18, 'c-bebidas', { track_stock: true, stock: 3, min_stock: 6 }),
  product('p-coca', 'Coca-Cola 500 ml', 10, 'c-bebidas', { track_stock: true, stock: 0, min_stock: 6 }),
]

export type Detail = {
  id: string
  name?: string
  product:{ id: string; name: string }
  product_id: string
  quantity: number
  price_at_purchase: number
  notes: string | null
  batch_number: number
  sent_at: string | null
  printed_at: string | null
  is_printed: boolean
  ready_at: string | null
}

export type Order = {
  id: string
  order_number: number
  status: string
  table_id: string | null
  table: { id: string; table_number: string } | null
  pickup_name: string | null
  pickup_phone: string | null
  waiter_id: string
  waiter: { id: string; first_names: string; last_names: string } | null
  details: Detail[]
  promotions?: { id: string; name: string; code: string | null }[]
  total: number
  tip: number | null
  created_at: string
}

export const tables = Array.from({ length: 10 }, (_, i) => ({
  id: `t-${i + 1}`,
  table_number: String(i + 1),
  capacity: [2, 4, 4, 6, 2, 4, 8, 4, 2, 6][i],
  status: 'available' as 'available' | 'occupied',
  current_order_id: null as string | null,
  current_order: null as null | { waiter_id: string; waiter: Order['waiter'] },
}))

export const orders: Order[] = []
let orderNumber = 120

export function recalc(o: Order) {
  o.total = o.details.reduce((s, d) => s + d.quantity * d.price_at_purchase, 0)
}

export function createOrder(tableId: string | null, waiterId: string, pickup?: { name: string; phone?: string }): Order {
  const table = tableId ? tables.find((t) => t.id === tableId) ?? null : null
  const waiter = users.find((u) => u.id === waiterId)
  const o: Order = {
    id: nextId(),
    order_number: ++orderNumber,
    status: 'pending',
    table_id: table?.id ?? null,
    table: table ? { id: table.id, table_number: table.table_number } : null,
    pickup_name: pickup?.name ?? null,
    pickup_phone: pickup?.phone ?? null,
    waiter_id: waiterId,
    waiter: waiter ? { id: waiter.id, first_names: waiter.first_names ?? '', last_names: waiter.last_names ?? '' } : null,
    details: [],
    promotions: [],
    total: 0,
    tip: null,
    created_at: now(),
  }
  orders.unshift(o)
  if (table) {
    table.status = 'occupied'
    table.current_order_id = o.id
    table.current_order = { waiter_id: waiterId, waiter: o.waiter }
  }
  return o
}

export function addDetail(o: Order, productId: string, quantity: number, notes: string | null) {
  const p = products.find((x) => x.id === productId)
  if (!p) throw Object.assign(new Error('Producto no encontrado.'), { status: 404, code: 'PRODUCT_NOT_FOUND' })
  if (p.track_stock && p.stock < quantity)
    throw Object.assign(new Error(`Stock insuficiente de ${p.name}: quedan ${p.stock}.`), { status: 400, code: 'INSUFFICIENT_STOCK' })
  if (p.track_stock) p.stock -= quantity
  o.details.push({ id: nextId(), name: p.name, product: { id: p.id, name: p.name }, product_id: p.id, quantity, price_at_purchase: p.price, notes, batch_number: 0, sent_at: null, printed_at: null, is_printed: false, ready_at: null })
  recalc(o)
}

// Datos iniciales: dos mesas ocupadas y un pedido para llevar.
{
  const a = createOrder('t-2', 'u-waiter')
  addDetail(a, 'p-vacio', 1, null)
  addDetail(a, 'p-costilla', 2, 'Término medio')
  addDetail(a, 'p-mocochinchi', 3, null)
  a.details.forEach((d) => {
    d.batch_number = 1
    d.sent_at = d.printed_at = new Date(Date.now() - 25 * 60_000).toISOString()
    d.is_printed = true
  })
  a.status = 'cooking'
  const b = createOrder('t-5', 'u-waiter')
  addDetail(b, 'p-silpancho', 2, 'Huevo extra')
  b.status = 'pending'
  const c = createOrder(null, 'u-cashier', { name: 'Carla', phone: '70000000' })
  addDetail(c, 'p-pique', 1, null)
  c.status = 'pending_payment'
}

export const supplies = [
  // Igual que la API: gramos y costo por gramo.
  { id: 's-carne', name: 'Carne de res', unit: 'GRAMO', current_stock: 18500, min_stock_alert: 5000, cost_per_unit: 0.062 },
  { id: 's-papa', name: 'Papa', unit: 'GRAMO', current_stock: 4000, min_stock_alert: 10000, cost_per_unit: 0.006 },
  { id: 's-arroz', name: 'Arroz', unit: 'GRAMO', current_stock: 25000, min_stock_alert: 8000, cost_per_unit: 0.009 },
  { id: 's-cebolla', name: 'Cebolla', unit: 'GRAMO', current_stock: 0, min_stock_alert: 3000, cost_per_unit: 0.0075 },
]

export const cash = {
  open: true,
  session: { id: 'cs-1', opened_at: new Date(Date.now() - 4 * 3600_000).toISOString(), opened_by: { first_names: 'Rosa', last_names: 'Flores' }, starting_cash: 200 },
}

export const invoices: Record<string, unknown>[] = []
let invoiceNumber = 3400
export const nextInvoiceNumber = () => ++invoiceNumber

export const notifications: AppNotification[] = [
  { id: 'n-1', title: 'Stock bajo', message: 'Quedan 3 Cerveza Paceña 620 ml.', type: 'warning', target_url: '/inventory', is_read: false, created_at: now() },
  { id: 'n-2', title: 'Cuenta en caja', message: 'Pedido para llevar de Carla listo para cobrar.', type: 'info', target_url: '/cashier', is_read: false, created_at: now() },
]
