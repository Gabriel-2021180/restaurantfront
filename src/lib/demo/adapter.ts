/**
 * Adaptador de axios del modo demo: responde como la API real usando los datos
 * en memoria de ./store. Solo se carga en desarrollo con VITE_DEMO=true.
 */
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import * as db from './store'

type Ctx = { body: Record<string, unknown>; query: URLSearchParams; userId: string | null }
type Handler = (params: string[], ctx: Ctx) => unknown

const routes: [string, RegExp, Handler][] = []
const on = (method: string, pattern: string, handler: Handler) =>
  routes.push([method, new RegExp('^' + pattern.replace(/:[a-z_]+/g, '([^/]+)') + '$'), handler])

class DemoError extends Error {
  status: number
  code?: string
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}
const fail = (status: number, message: string, code?: string): never => {
  throw new DemoError(status, message, code)
}

const findOrder = (id: string) => db.orders.find((o) => o.id === id) ?? fail(404, 'Pedido no encontrado.', 'ORDER_NOT_FOUND')
const tokenFor = (userId: string) => `demo.${userId}`
const me = (ctx: Ctx) => db.users.find((u) => u.id === ctx.userId) ?? fail(401, 'Sesión expirada.', 'UNAUTHORIZED')
const roleOf = (ctx: Ctx) => {
  const r = me(ctx).role
  return typeof r === 'object' ? r?.slug : r
}

// --- Marca y sesión ---
const branding = { name: 'Churrasquería Demo', logo_url: null as string | null, favicon_url: null as string | null, accent_color: null as string | null }
const formValue = (body: unknown, key: string) => (body instanceof FormData ? body.get(key) : (body as Record<string, unknown>)[key])
const fileUrl = (v: unknown) => (v instanceof File ? URL.createObjectURL(v) : null)
on('get', '/settings/branding', () => ({ ...branding }))
on('put', '/settings/branding', (_, { body }) => {
  const name = formValue(body, 'name')
  const accent = formValue(body, 'accent_color')
  if (typeof name === 'string') branding.name = name
  if (typeof accent === 'string') branding.accent_color = accent || null
  if (formValue(body, 'remove_logo') === 'true') branding.logo_url = null
  if (formValue(body, 'remove_favicon') === 'true') branding.favicon_url = null
  branding.logo_url = fileUrl(formValue(body, 'logo')) ?? branding.logo_url
  branding.favicon_url = fileUrl(formValue(body, 'favicon')) ?? branding.favicon_url
  return { ...branding }
})
let qrUrl: string | null = null
on('get', '/finance/qr', () => ({ qr_static_url: qrUrl }))
on('put', '/finance/config/qr', (_, { body }) => {
  qrUrl = formValue(body, 'remove_qr') === 'true' ? null : (fileUrl(formValue(body, 'qr')) ?? qrUrl)
  return { qr_static_url: qrUrl }
})
on('post', '/auth/login', (_, { body }) => {
  const user = db.users.find((u) => u.email === String(body.email).toLowerCase())
  if (!user || body.password !== (user.demo_password ?? db.DEMO_PASSWORD)) fail(401, 'Credenciales inválidas.', 'INVALID_CREDENTIALS')
  sessionStorage.setItem('demo-rt', user!.id)
  return { access_token: tokenFor(user!.id), user, access_expires_in: 900 }
})
// Demo: la "cookie" de sesión es un valor en sessionStorage (en la API real es httpOnly).
on('post', '/auth/refresh', () => {
  const id = sessionStorage.getItem('demo-rt')
  const u = db.users.find((x) => x.id === id) ?? fail(401, 'Sesión vencida.', 'REFRESH_INVALID')
  return { access_token: tokenFor(u.id), user: u, access_expires_in: 900 }
})
on('post', '/auth/logout', () => {
  sessionStorage.removeItem('demo-rt')
  return { message: 'ok' }
})
on('get', '/auth/profile', (_, ctx) => me(ctx))
on('patch', '/auth/security-question', (_, ctx) => Object.assign(me(ctx), { security_question: 'configurada' }))

// --- Notificaciones ---
// --- Usuarios (pantalla del dueño) ---
const userRole = (u: (typeof db.users)[number]) => (typeof u.role === 'object' && u.role ? u.role : null)
on('get', '/roles', () => {
  const seen = new Map<string, unknown>()
  for (const u of db.users) { const r = userRole(u); if (r?.id && !seen.has(r.id)) seen.set(r.id, r) }
  return [...seen.values()]
})
on('get', '/users', () => db.users.map((u) => ({ created_at: '2026-01-10T12:00:00Z', is_banned: false, ...u })))
on('patch', '/users/change-password', (_, ctx) => {
  const u = me(ctx)
  if (ctx.body.old_password !== (u.demo_password ?? db.DEMO_PASSWORD)) fail(400, 'La contraseña actual no es correcta.', 'INVALID_PASSWORD')
  return Object.assign(u, { is_password_temporary: false, demo_password: String(ctx.body.new_password) })
})
on('patch', '/users/:id', ([id], { body }) => {
  const u = db.users.find((x) => x.id === id) ?? fail(404, 'Usuario no encontrado', 'USER_NOT_FOUND')
  if (id === 'u-owner' && ('role_id' in body || 'is_banned' in body)) fail(403, 'No puedes cambiar tu propio rol ni bloquearte.', 'SELF_ADMIN_FORBIDDEN')
  if (body.email && db.users.some((x) => x.id !== id && x.email === body.email)) fail(409, 'Ese correo ya está registrado.', 'EMAIL_TAKEN')
  const { role_id, ...rest } = body as Record<string, unknown>
  Object.assign(u, rest)
  if (role_id) {
    const r = db.users.map(userRole).find((x) => x?.id === role_id)
    if (r) u.role = r
  }
  return u
})
on('get', '/users/notifications', () => db.notifications)
on('patch', '/users/notifications/read-all', () => {
  db.notifications.forEach((n) => (n.is_read = true))
  return { updated: db.notifications.length }
})
on('patch', '/users/notifications/:id/read', ([id]) => {
  const n = db.notifications.find((x) => x.id === id)
  if (n) n.is_read = true
  return { id, is_read: true }
})

// --- Menú, mesas, insumos ---
on('get', '/menu/categories', () => db.categories)
on('get', '/menu/products', () => db.products)
const deletedProducts: typeof db.products = []
const formOrJson = (body: unknown) => (body instanceof FormData ? Object.fromEntries(body.entries()) : (body as Record<string, unknown>))
on('get', '/menu/products/deleted', () => deletedProducts)
on('get', '/menu/categories/deleted', () => [])
on('patch', '/menu/products/:id/toggle', ([id]) => {
  const prod = db.products.find((x) => x.id === id) ?? fail(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND')
  prod!.is_active = !prod!.is_active
  return prod
})
on('patch', '/menu/products/:id/restore', ([id]) => {
  const i = deletedProducts.findIndex((x) => x.id === id)
  if (i >= 0) db.products.push(...deletedProducts.splice(i, 1))
  return { message: 'Restaurado' }
})
on('delete', '/menu/products/:id', ([id]) => {
  const i = db.products.findIndex((x) => x.id === id)
  if (i < 0) fail(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND')
  deletedProducts.push(...db.products.splice(i, 1))
  return { message: 'Producto en papelera' }
})
on('patch', '/menu/products/:id', ([id], { body }) => {
  const prod = db.products.find((x) => x.id === id) ?? fail(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND')
  const b = formOrJson(body)
  for (const k of ['name', 'description', 'category_id'] as const) if (typeof b[k] === 'string') (prod as Record<string, unknown>)[k] = b[k]
  for (const k of ['price', 'stock', 'purchase_price', 'fixed_cost'] as const) if (b[k] != null) (prod as Record<string, unknown>)[k] = Number(b[k])
  if (b.track_stock != null) prod!.track_stock = String(b.track_stock) === 'true'
  if (b.file instanceof File) prod!.image_url = URL.createObjectURL(b.file)
  return prod
})
on('post', '/menu/products', (_, { body }) => {
  const b = formOrJson(body)
  const cat = db.categories.find((c) => c.id === b.category_id) ?? db.categories[0]
  const prod = { ...db.products[0], id: db.nextId(), name: String(b.name), description: String(b.description ?? ''), price: Number(b.price), category_id: cat.id, category: { id: cat.id, name: cat.name }, is_active: true, track_stock: String(b.track_stock) === 'true', stock: Number(b.stock ?? 0), min_stock: 0, image_url: b.file instanceof File ? URL.createObjectURL(b.file) : null }
  db.products.push(prod)
  return prod
})
on('get', '/menu/products/:id', ([id]) => db.products.find((p) => p.id === id) ?? fail(404, 'Producto no encontrado.', 'PRODUCT_NOT_FOUND'))
// --- Reservas (en memoria, mismo contrato que la API) ---
type DemoReservation = {
  id: string; table: { id: string; number: string } | null; customer_name: string; customer_phone: string | null
  party_size: number; reserved_at: string; duration_min: number; ends_at: string; notes: string | null
  status: string; seated_order_id: string | null; created_by: { id: string; name: string } | null; created_at: string; updated_at: string
}
const laPazDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(d)
const inMinutes = (m: number) => new Date(Math.round((Date.now() + m * 60_000) / 900_000) * 900_000)
const reservations: DemoReservation[] = []
const makeReservation = (tableId: string | null, data: Partial<DemoReservation> & { reserved_at: string }): DemoReservation => {
  const table = tableId ? db.tables.find((t) => t.id === tableId) ?? null : null
  const duration = data.duration_min ?? 90
  return {
    id: db.nextId(), table: table ? { id: table.id, number: String(table.table_number) } : null,
    customer_name: data.customer_name ?? 'Cliente', customer_phone: data.customer_phone ?? null, party_size: data.party_size ?? 2,
    reserved_at: new Date(data.reserved_at).toISOString(), duration_min: duration,
    ends_at: new Date(new Date(data.reserved_at).getTime() + duration * 60_000).toISOString(), notes: data.notes ?? null,
    status: 'pending', seated_order_id: null, created_by: { id: 'u-waiter', name: 'Luis Mamani' }, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }
}
reservations.push(
  makeReservation('t-3', { customer_name: 'Familia Rojas', customer_phone: '71234567', party_size: 4, reserved_at: inMinutes(40).toISOString(), notes: 'Cumpleaños, traen torta' }),
  makeReservation('t-7', { customer_name: 'Marcelo Ortiz', party_size: 6, reserved_at: inMinutes(180).toISOString() }),
  makeReservation(null, { customer_name: 'Daniela Paz', customer_phone: '76543210', party_size: 2, reserved_at: inMinutes(60 * 26).toISOString() }),
)
const blocking = (tableId: string) =>
  reservations.find((r) => r.table?.id === tableId && r.status === 'pending' && Math.abs(new Date(r.reserved_at).getTime() - Date.now() - 15 * 60_000) <= 45 * 60_000)
const nextToday = (tableId: string) =>
  reservations
    .filter((r) => r.table?.id === tableId && r.status === 'pending' && laPazDay(new Date(r.reserved_at)) === laPazDay(new Date()) && new Date(r.reserved_at).getTime() > Date.now() - 30 * 60_000)
    .sort((a, b) => a.reserved_at.localeCompare(b.reserved_at))[0]
const withReservation = (t: (typeof db.tables)[number]) => {
  const next = nextToday(t.id)
  return {
    ...t,
    status: t.status === 'available' && blocking(t.id) ? 'reserved' : t.status,
    next_reservation: next ? { id: next.id, customer_name: next.customer_name, party_size: next.party_size, reserved_at: next.reserved_at } : null,
  }
}
const findReservation = (id: string) => reservations.find((r) => r.id === id) ?? fail(404, 'Reserva no encontrada', 'RESERVATION_NOT_FOUND')
const checkConflict = (r: DemoReservation) => {
  if (!r.table) return
  const t = db.tables.find((x) => x.id === r.table!.id)!
  if (r.party_size > t.capacity) fail(400, `La mesa ${t.table_number} admite ${t.capacity} personas.`, 'TABLE_CAPACITY_EXCEEDED')
  const clash = reservations.some((o) => o.id !== r.id && o.table?.id === r.table!.id && ['pending', 'seated'].includes(o.status) && o.reserved_at < r.ends_at && r.reserved_at < o.ends_at)
  if (clash) fail(409, 'La mesa ya tiene una reserva en ese horario.', 'RESERVATION_CONFLICT')
}
on('get', '/reservations', (_, { query }) => {
  const from = query.get('from') ?? laPazDay(new Date())
  const to = query.get('to') ?? from
  const statuses = query.get('status')?.split(',')
  return reservations
    .filter((r) => { const d = laPazDay(new Date(r.reserved_at)); return d >= from && d <= to && (!statuses || statuses.includes(r.status)) })
    .sort((a, b) => a.reserved_at.localeCompare(b.reserved_at))
})
on('post', '/reservations', (_, { body }) => {
  if (new Date(String(body.reserved_at)).getTime() < Date.now() - 5 * 60_000) fail(400, 'La hora de la reserva ya pasó.', 'RESERVATION_IN_PAST')
  const r = makeReservation((body.table_id as string) ?? null, body as Partial<DemoReservation> & { reserved_at: string })
  checkConflict(r)
  reservations.push(r)
  return r
})
on('patch', '/reservations/:id/status', ([id], { body }) => {
  const r = findReservation(id)
  r.status = String(body.status)
  r.updated_at = new Date().toISOString()
  return r
})
on('patch', '/reservations/:id', ([id], { body }) => {
  const r = findReservation(id)
  if (r.status !== 'pending') fail(409, 'Solo se editan reservas pendientes.', 'RESERVATION_NOT_PENDING')
  const next = makeReservation(body.table_id === undefined ? (r.table?.id ?? null) : ((body.table_id as string) ?? null), { ...r, ...body, reserved_at: String(body.reserved_at ?? r.reserved_at) } as DemoReservation)
  Object.assign(r, { ...next, id: r.id, created_at: r.created_at, created_by: r.created_by })
  checkConflict(r)
  return r
})
on('delete', '/reservations/:id', ([id]) => {
  const r = findReservation(id)
  if (r.status !== 'pending') fail(409, 'La reserva ya no está pendiente.', 'INVALID_STATUS_TRANSITION')
  r.status = 'cancelled'
  return r
})
on('get', '/tables', () => db.tables.map(withReservation))
on('get', '/tables/trashed', () => [])
on('get', '/inventory/supplies', () => db.supplies)
const findSupply = (id: string) => db.supplies.find((x) => x.id === id) ?? fail(404, 'Insumo no encontrado', 'SUPPLY_NOT_FOUND')
on('post', '/inventory/supplies', (_, { body }) => {
  const sup = { id: db.nextId(), name: String(body.name), unit: String(body.unit ?? 'GRAMO'), current_stock: Number(body.current_stock) || 0, min_stock_alert: Number(body.min_stock_alert) || 0, cost_per_unit: Number(body.cost_per_unit) || 0 }
  db.supplies.push(sup)
  return sup
})
on('patch', '/inventory/supplies/:id', ([id], { body }) => Object.assign(findSupply(id)!, body))
on('delete', '/inventory/supplies/:id', ([id]) => {
  const i = db.supplies.findIndex((x) => x.id === id)
  if (i < 0) fail(404, 'Insumo no encontrado', 'SUPPLY_NOT_FOUND')
  db.supplies.splice(i, 1)
  return { message: 'Insumo eliminado' }
})
on('post', '/inventory/supplies/:id/stock', ([id], { body }) => {
  const sup = findSupply(id)!
  sup.current_stock += Number(body.quantity) || 0
  if (body.new_cost != null) sup.cost_per_unit = Number(body.new_cost)
  return sup
})
on('get', '/marketing/discounts', () => [])
on('get', '/marketing/discounts/trash', () => [])

// --- Pedidos ---
on('get', '/orders', (_, { query }) => {
  const status = query.get('status')?.split(',')
  const active = query.get('active') === 'true'
  const ACTIVE = ['pending', 'cooking', 'ready', 'in_process', 'pending_payment']
  return db.orders.filter((o) => (!status || status.includes(o.status)) && (!active || ACTIVE.includes(o.status))).slice(0, 50)
})
on('get', '/orders/active-pickups', () => db.orders.filter((o) => !o.table_id && o.status !== 'billed'))
on('post', '/orders', (_, ctx) => {
  const table = db.tables.find((t) => t.id === ctx.body.table_id) ?? fail(404, 'Mesa no encontrada.', 'TABLE_NOT_FOUND')
  if (table!.status !== 'available') fail(409, 'La mesa ya está ocupada.', 'TABLE_NOT_FREE')
  const reservationId = ctx.body.reservation_id as string | undefined
  const block = blocking(table!.id)
  if (block && !reservationId) fail(409, `La mesa está reservada para ${block.customer_name}.`, 'TABLE_RESERVED')
  const order = db.createOrder(table!.id, me(ctx).id)
  if (reservationId) {
    const r = findReservation(reservationId)
    if (r.status !== 'pending') fail(409, 'La reserva ya no está pendiente.', 'RESERVATION_NOT_PENDING')
    Object.assign(r, { status: 'seated', seated_order_id: order.id })
  }
  return order
})
on('post', '/orders/pickup', (_, ctx) => {
  const o = db.createOrder(null, me(ctx).id, { name: String(ctx.body.pickup_name ?? 'Cliente'), phone: String(ctx.body.pickup_phone ?? '') })
  for (const it of (ctx.body.items as { product_id: string; quantity: number; notes?: string }[]) ?? []) db.addDetail(o, it.product_id, it.quantity, it.notes ?? null)
  return { message: 'Pedido creado.', order: o }
})
on('get', '/orders/:id', ([id]) => findOrder(id))
on('post', '/orders/:id/items', ([id], { body }) => {
  const o = findOrder(id)
  const qty = Number(body.quantity)
  if (!Number.isInteger(qty) || qty < 1) fail(400, 'La cantidad mínima es 1', 'VALIDATION_ERROR')
  db.addDetail(o, String(body.product_id), qty, (body.notes as string) || null)
  return o
})
on('delete', '/orders/items/:id', ([id]) => {
  const o = db.orders.find((x) => x.details.some((d) => d.id === id)) ?? fail(404, 'Ítem no encontrado.', 'ITEM_NOT_FOUND')
  const d = o!.details.find((x) => x.id === id)!
  if (d.sent_at) fail(409, 'Ese plato ya se envió a cocina.', 'ITEM_ALREADY_SENT')
  const p = db.products.find((x) => x.id === d.product_id)
  if (p?.track_stock) p.stock += d.quantity
  o!.details = o!.details.filter((x) => x.id !== id)
  db.recalc(o!)
  return { message: 'Eliminado.' }
})
on('post', '/orders/:id/kitchen', ([id]) => {
  const o = findOrder(id)
  const pending = o.details.filter((d) => !d.sent_at)
  if (!pending.length) fail(400, 'No hay platos nuevos para enviar.', 'NOTHING_TO_SEND')
  const batch = Math.max(0, ...o.details.map((d) => d.batch_number)) + 1
  pending.forEach((d) => {
    d.batch_number = batch
    d.sent_at = d.printed_at = new Date().toISOString()
    d.is_printed = true
  })
  o.status = 'cooking'
  return { batch_number: batch }
})
on('get', '/orders/:id/kitchen-history', ([id]) => {
  const o = findOrder(id)
  const groups = new Map<number, typeof o.details>()
  o.details.forEach((d) => groups.set(d.batch_number, [...(groups.get(d.batch_number) ?? []), d]))
  return [...groups.entries()].map(([batch_number, items]) => ({
    batch_number,
    sent_at: items[0]?.sent_at,
    ready_at: items.every((i) => i.ready_at) ? items[0]?.ready_at : null,
    table_number: o.table?.table_number ?? null,
    items: items.map((i) => ({ id: i.id, product_name: i.product.name, name: i.product.name, quantity: i.quantity, notes: i.notes })),
  }))
})
on('patch', '/orders/:id/batches/:batch/ready', ([id, batch]) => {
  const o = findOrder(id)
  const at = new Date().toISOString()
  o.details.filter((d) => d.batch_number === Number(batch)).forEach((d) => (d.ready_at = at))
  return { order_id: id, batch_number: Number(batch), ready_at: at }
})
on('patch', '/orders/:id/close', ([id]) => {
  const o = findOrder(id)
  o.status = 'pending_payment'
  return o
})

// --- Caja y facturas ---
on('get', '/finance/cash-register/status', () =>
  db.cash.open
    ? { is_open: true, isOpen: true, session: db.cash.session, ...db.cash.session, sales: { cash: 340, qr: 310, card: 0, total: 650 }, expected_in_drawer: 540, expected: { cash: 540, qr: 310, card: 0, total: 850 } }
    : { is_open: false, isOpen: false, session: null },
)
on('post', '/finance/cash-register/open', (_, { body }) => {
  db.cash.open = true
  db.cash.session = { ...db.cash.session, opened_at: new Date().toISOString(), starting_cash: Number(body.starting_cash) || 0 }
  return db.cash.session
})
on('post', '/finance/cash-register/close', () => {
  db.cash.open = false
  return { message: 'Caja cerrada.' }
})
on('get', '/finance/cash-register/daily-shifts', () => [
  { id: 's-1', opened_at: new Date(Date.now() - 9 * 3600_000).toISOString(), closed_at: new Date(Date.now() - 4 * 3600_000).toISOString(), starting_cash: 200, closing_cash_count: 1180, difference: -20, status: 'closed', notes: null, openedBy: { first_names: 'Rosa', last_names: 'Flores' }, closedBy: { first_names: 'Rosa', last_names: 'Flores' }, breakdown: null },
  { id: 's-2', opened_at: new Date(Date.now() - 4 * 3600_000).toISOString(), closed_at: null, starting_cash: 200, closing_cash_count: null, difference: null, status: 'open', notes: null, openedBy: { first_names: 'Rosa', last_names: 'Flores' }, closedBy: null, breakdown: null },
])
let financeConfig: Record<string, unknown> = { name: 'Churrasquería Demo', nit: '1234567019', address: 'Av. Arce 2100, La Paz', phone: '22000000', legend_law: 'Ley N° 453', enable_auto_close: false, auto_close_time: '00:00', block_sale_on_low_supply: false }
on('get', '/finance/config', () => financeConfig)
on('put', '/finance/config', (_, { body }) => (financeConfig = { ...financeConfig, ...body }))
// Facturas de ejemplo para ver el historial sin cobrar antes.
const DEMO_BUSINESS = { name: 'Churrasquería Demo', address: 'Av. Ballivián 1234, Cochabamba', phone: '4 4251234' }
const line = (id: string, name: string, qty: number, price: number, extra: Record<string, unknown> = {}) => ({ id, product_name: name, quantity: qty, price_at_purchase: price, discount_amount: 0, parent_detail_id: null, ...extra })
const DEMO_DETAILS: Record<number, unknown[]> = {
  1042: [line('d1', 'Pique macho', 2, 85), line('d2', 'Combo familiar', 1, 99, { discount_amount: 15 }), line('d3', 'Vacío', 1, 0, { parent_detail_id: 'd2' }), line('d4', 'Mocochinchi', 2, 0, { parent_detail_id: 'd2' }), line('d5', 'Cerveza Paceña 620 ml', 1, 30)],
  1041: [line('d6', 'Silpancho', 1, 48), line('d7', 'Sajta de pollo', 1, 42), line('d8', 'Mocochinchi', 1, 6.5)],
}
if (!db.invoices.length) {
  const mk = (n: number, name: string, nit: string, total: number, minsAgo: number, ident: string, method: string) =>
    ({ id: `inv-${n}`, invoice_number: n, client_name: name, client_nit: nit, total_amount: total, transaction_date: new Date(Date.now() - minsAgo * 60_000).toISOString(), is_annulled: false, annulment_reason: null, payment_method: method, order_identifier: ident, nit_emisor: '1234567019', authorization_code: 'DEMO-' + n, legend_law: 'Ley N° 453: Tienes derecho a recibir información sobre las características y contenidos de los servicios que utilices.', literal_amount: '', business_config: DEMO_BUSINESS, payments: [{ method, amount: total }], is_partial: !DEMO_DETAILS[n], items: [], order: { table: ident.startsWith('Mesa') ? { table_number: ident.slice(5) } : null, details: DEMO_DETAILS[n] ?? [] } }) as unknown as (typeof db.invoices)[number]
  db.invoices.push(mk(1042, 'Familia Rojas', '4567891', 284, 35, 'Mesa 3', 'QR'), mk(1041, 'Marcelo Ortiz', '0', 96.5, 80, 'Para llevar: Marcelo', 'EFECTIVO'), mk(1040, 'Daniela Paz', '7654321', 158, 140, 'Mesa 6', 'TARJETA'))
}
on('post', '/finance/invoices/:id/void', ([id], { body }) => {
  const inv = (db.invoices as unknown as { id: string; is_annulled: boolean; annulment_reason: string | null }[]).find((x) => x.id === id) ?? fail(404, 'Factura no encontrada.', 'INVOICE_NOT_FOUND')
  if (inv!.is_annulled) fail(409, 'La factura ya está anulada.', 'INVOICE_ALREADY_VOID')
  inv!.is_annulled = true
  inv!.annulment_reason = String(body.reason ?? '')
  return inv
})
on('get', '/finance/invoices', (_, { query }) => {
  const page = Number(query.get('page') ?? 1)
  const limit = Number(query.get('limit') ?? 10)
  return { data: db.invoices.slice((page - 1) * limit, page * limit), meta: { page, limit, total: db.invoices.length, last_page: Math.max(1, Math.ceil(db.invoices.length / limit)) } }
})
on('get', '/finance/invoices/report/daily', () => ({ currency: 'Bs', grand_total: 3184.5, breakdown: [{ method: 'EFECTIVO', count: 14, total: 1720 }, { method: 'QR', count: 9, total: 1164.5 }, { method: 'TARJETA', count: 2, total: 300 }] }))
on('get', '/analytics/day-summary', (_, { query }) => ({ date: query.get('date'), total_sales: 3184.5, orders_count: 25, average_ticket: 127.38, top_product: { name: 'Pique macho', sold: 11 }, peak_hour: '20:00', cancelled: 1, top_waiter_by_sales: { name: 'Luis Mamani', total: 1890 } }))
on('post', '/finance/invoices', (_, ctx) => {
  if (!db.cash.open) fail(400, 'La caja está cerrada. Ábrela para poder facturar.', 'CASH_REGISTER_CLOSED')
  const o = findOrder(String(ctx.body.order_id))
  if (!o.details.length) fail(400, 'El pedido no tiene productos.', 'ORDER_EMPTY')
  o.status = 'billed'
  const table = db.tables.find((t) => t.id === o.table_id)
  if (table) Object.assign(table, { status: 'available', current_order_id: null, current_order: null })
  const inv = {
    id: db.nextId(),
    invoice_number: db.nextInvoiceNumber(),
    order_id: o.id,
    order: o,
    details: o.details,
    total_amount: o.total,
    client_name: ctx.body.client_name ?? 'SIN NOMBRE',
    client_nit: ctx.body.client_nit ?? '0',
    payment_method: ctx.body.payment_method ?? 'EFECTIVO',
    transaction_date: new Date().toISOString(),
    nit_emisor: '1234567019',
    authorization_code: 'DEMO-' + Date.now().toString(36).toUpperCase(),
    legend_law: 'Ley N° 453: Tienes derecho a recibir información sobre las características y contenidos de los servicios que utilices.',
    business_config: DEMO_BUSINESS,
    payments: ctx.body.payments ?? [{ method: ctx.body.payment_method ?? 'EFECTIVO', amount: o.total }],
    amount_received: ctx.body.amount_received ?? null,
    change: ctx.body.amount_received ? Math.max(0, Number(ctx.body.amount_received) - Number(o.total)) : null,
    items: [],
  }
  db.invoices.unshift(inv)
  return inv
})
on('get', '/finance/invoices/:id', ([id]) => db.invoices.find((i) => i.id === id) ?? fail(404, 'Factura no encontrada.', 'INVOICE_NOT_FOUND'))

// --- Métricas (datos de ejemplo estables, para ver los paneles) ---
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const wave = (i: number, base: number, amp: number) => Math.round(base + amp * Math.sin(i * 1.3) + amp * 0.4 * Math.cos(i * 0.7))
on('get', '/analytics/dashboard-kpi', () => ({ period: 'Este Periodo', total_revenue: 48250.5, net_profit: 17930.2, average_ticket: 142.8, profit_margin: 37.2 }))
on('get', '/analytics/channels', () => ({ period: 'custom', dine_in: { count: 248, total: 36120 }, pickup: { count: 91, total: 12130.5 }, winner: 'Mesas' }))
on('get', '/analytics/payment-methods', () => [
  { method: 'EFECTIVO', count: 180, total: 25300 },
  { method: 'QR', count: 120, total: 18450.5 },
  { method: 'TARJETA', count: 39, total: 4500 },
])
on('get', '/analytics/top-products', () => [
  { name: 'Pique macho', sold: 132, revenue: 11220 },
  { name: 'Vacío', sold: 118, revenue: 8024 },
  { name: 'Silpancho', sold: 97, revenue: 4074 },
  { name: 'Costilla de res', sold: 84, revenue: 4620 },
  { name: 'Mocochinchi', sold: 160, revenue: 1600 },
  { name: 'Sajta de pollo', sold: 51, revenue: 1938 },
])
on('get', '/analytics/top-profitable', () => [
  { name: 'Pique macho', sold: 132, revenue: 11220, profit: 5180 },
  { name: 'Vacío', sold: 118, revenue: 8024, profit: 3420 },
  { name: 'Costilla de res', sold: 84, revenue: 4620, profit: 2010 },
  { name: 'Silpancho', sold: 97, revenue: 4074, profit: 1740 },
  { name: 'Mocochinchi', sold: 160, revenue: 1600, profit: 1120 },
  { name: 'Sajta de pollo', sold: 51, revenue: 1938, profit: 760 },
])
on('get', '/analytics/peak-hours', () => Array.from({ length: 13 }, (_, i) => ({ hour: `${i + 11}:00`, orders_count: Math.max(0, [4, 18, 31, 26, 9, 3, 2, 5, 14, 27, 33, 21, 8][i]) })))
on('get', '/analytics/weekly-pattern', () => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, i) => ({ day, average_sales: [980, 1040, 1120, 1310, 2140, 2760, 2290][i], traffic: [9, 10, 11, 13, 19, 24, 21][i] })))
on('get', '/analytics/year-comparison', (_, { query }) => {
  const now = new Date().getMonth()
  const year = Number(query.get('year')) || new Date().getFullYear()
  return { current_year: year, compared_to: year - 1, data: MONTHS.map((month, i) => ({ month, year_current: i <= now ? wave(i, 41000, 7000) : 0, year_past: wave(i + 2, 35000, 6000), growth_percentage: '' })) }
})

on('get', '/analytics/dashboard-visual', () => ({
  cards: { total_sales: 48250.5, total_orders: 339, top_employee: 'Luis Mamani (21540.00 Bs)' },
  charts: { waiters: { labels: ['Luis Mamani', 'Paola Choque', 'Iván Quispe'], series: [21540, 14980, 11730.5] }, payments: { labels: ['EFECTIVO', 'QR', 'TARJETA'], series: [25300, 18450.5, 4500] } },
}))
on('get', '/analytics/performance-global', () => ({
  waiters: [
    { full_name: 'Luis Mamani', tables_served: 112, sales_generated: '21540.00 Bs' },
    { full_name: 'Paola Choque', tables_served: 81, sales_generated: '14980.00 Bs' },
    { full_name: 'Iván Quispe', tables_served: 55, sales_generated: '11730.50 Bs' },
  ],
  cashiers: [{ full_name: 'Rosa Flores', invoices: 301, collected: '42110.50 Bs', pickups_handled: 64 }],
  admins: [{ full_name: 'Ana Quispe', actions: 0, pickups_created: 27, pickup_sales: '3240.00 Bs' }],
}))
// Registro de actividad de ejemplo (mismo formato que la API).
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const carla = { id: 'u-owner', name: 'Carla Vargas', role: 'Dueño' }
const ana = { id: 'u-admin', name: 'Ana Quispe', role: 'Administrador' }
const rosa = { id: 'u-cashier', name: 'Rosa Flores', role: 'Cajero' }
const AUDIT = [
  { id: 'a1', at: ago(0.5), actor: ana, entity: 'product', entity_id: 'p-pique', entity_label: 'Pique macho', action: 'update', changes: [{ field: 'price', before: 80, after: 85 }, { field: 'description', before: 'Para 1', after: 'Para 1 persona, con papas' }], reason: null },
  { id: 'a2', at: ago(1.2), actor: rosa, entity: 'invoice', entity_id: 'inv-1039', entity_label: '1039', action: 'void', changes: [], reason: 'Cliente pidió factura con otro NIT' },
  { id: 'a3', at: ago(3), actor: ana, entity: 'supply', entity_id: 's-carne', entity_label: 'Carne de res (vacío)', action: 'restock', changes: [{ field: 'current_stock', before: 1200, after: 6200 }], reason: '+5 kg' },
  { id: 'a4', at: ago(9), actor: rosa, entity: 'cash_register', entity_id: 'cs-1', entity_label: null, action: 'close', changes: [{ field: 'closing_cash_count', before: null, after: 1710 }, { field: 'difference', before: null, after: -10 }, { field: 'status', before: 'open', after: 'closed' }], reason: null },
  { id: 'a5', at: ago(26), actor: carla, entity: 'user', entity_id: 'u-waiter', entity_label: 'Luis Mamani', action: 'role_change', changes: [{ field: 'role', before: 'Cajero', after: 'Mesero' }], reason: null },
  { id: 'a6', at: ago(27), actor: carla, entity: 'promotion', entity_id: 'pr-1', entity_label: 'Martes de costilla 2x1', action: 'create', changes: [], reason: null },
  { id: 'a7', at: ago(30), actor: ana, entity: 'product', entity_id: 'p-coca', entity_label: 'Coca-Cola 500 ml', action: 'update', changes: [{ field: 'is_active', before: true, after: false }], reason: null },
  { id: 'a8', at: ago(49), actor: carla, entity: 'settings', entity_id: null, entity_label: 'Datos de factura', action: 'update', changes: [{ field: 'address', before: 'Av. Ballivián 1200', after: 'Av. Ballivián 1234, Cochabamba' }], reason: null },
  { id: 'a9', at: ago(50), actor: { id: null, name: 'Sistema', role: null }, entity: 'cash_register', entity_id: 'cs-0', entity_label: null, action: 'close', changes: [{ field: 'difference', before: null, after: 0 }], reason: 'Cierre automático' },
]
on('get', '/analytics/audit-log/actors', () => {
  const m = new Map<string, { id: string | null; name: string; role: string | null; events: number }>()
  for (const e of AUDIT) { const k = e.actor.id ?? 'system'; const c = m.get(k) ?? { ...e.actor, events: 0 }; c.events++; m.set(k, c) }
  return [...m.values()].sort((a, b) => b.events - a.events)
})
on('get', '/analytics/audit-log', (_, { query }) => {
  const ents = query.get('entity')?.split(',')
  const actor = query.get('actor_id')
  const q = query.get('q')?.toLowerCase()
  const rows = AUDIT.filter((e) => (!ents || ents.includes(e.entity)) && (!actor || e.actor.id === actor) && (!q || [e.entity_label, e.actor.name, e.reason].some((v) => v?.toLowerCase().includes(q))))
  const page = Number(query.get('page') ?? 1)
  const limit = Number(query.get('limit') ?? 20)
  return { data: rows.slice((page - 1) * limit, page * limit), meta: { page, limit, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / limit)) } }
})
on('get', '/analytics/alerts', () => ({
  low_stock: [
    { id: 's-carne', name: 'Carne de res (vacío)', kind: 'supply', stock: 1800, min: 3000, unit: 'GRAMO' },
    { id: 'p-coca', name: 'Coca-Cola 500 ml', kind: 'product', stock: 0, min: 6, unit: 'u' },
  ],
  cash_differences: [{ session_id: 'cs-1', closed_at: ago(9), closed_by: 'Rosa Flores', difference: -10 }],
  voided_invoices: [{ id: 'inv-1039', invoice_number: 1039, total: 112, reason: 'Cliente pidió factura con otro NIT', annulled_by: 'Rosa Flores', at: ago(1.2) }],
  no_show_reservations: [],
  open_orders_old: [],
}))

// --- Propinas (solo el propio mesero) ---
on('get', '/users/tips', (_, ctx) => {
  if (roleOf(ctx) !== 'waiter') fail(403, 'Solo el mesero ve sus propinas.', 'MISSING_PERMISSION')
  return { stats: { total_money: 0, count: 0 }, history: [] }
})

const respond = (config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse => ({
  data,
  status,
  statusText: String(status),
  headers: new AxiosHeaders(),
  config,
  request: {},
})

export const demoAdapter: AxiosAdapter = async (config) => {
  await new Promise((r) => setTimeout(r, 180)) // latencia realista
  const url = new URL(config.url ?? '', 'http://demo.local')
  const path = url.pathname.replace(/^\/api\/v1/, '')
  const method = (config.method ?? 'get').toLowerCase()
  const auth = String(config.headers?.Authorization ?? '')
  const query = new URLSearchParams(url.search)
  for (const [k, v] of Object.entries((config.params ?? {}) as Record<string, unknown>)) if (v != null) query.set(k, String(v))
  const ctx: Ctx = {
    body: typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data ?? {}),
    query,
    userId: auth.startsWith('Bearer demo.') ? auth.slice('Bearer demo.'.length) : null,
  }
  const route = routes.find(([m, re]) => m === method && re.test(path))
  try {
    const data = route ? route[2](path.match(route[1])!.slice(1), ctx) : method === 'get' ? [] : { message: 'OK (demo)' }
    return respond(config, 200, structuredClone(data))
  } catch (err) {
    const known = err as { status?: number; code?: string; message?: string }
    const e = err instanceof DemoError ? err : new DemoError(known.status ?? 500, known.message ?? 'Error de demo', known.code)
    const response = respond(config, e.status, { statusCode: e.status, message: e.message, error: e.code })
    throw new AxiosError(e.message, String(e.status), config, {}, response)
  }
}
