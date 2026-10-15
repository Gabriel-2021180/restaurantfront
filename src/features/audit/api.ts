import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import api from '@/lib/api/client'
import type { DateRange } from '@/lib/date-range'
import { formatMoney } from '@/lib/format'

export type AuditEntity = 'product' | 'category' | 'promotion' | 'supply' | 'table' | 'invoice' | 'cash_register' | 'user' | 'invite' | 'settings' | 'reservation'

export interface AuditChange {
  field: string
  before: unknown
  after: unknown
  redacted?: boolean
}

export interface AuditEvent {
  id: string
  at: string
  actor: { id: string | null; name: string; role: string | null }
  entity: AuditEntity
  entity_id: string | null
  entity_label: string | null
  action: string
  changes: AuditChange[]
  reason: string | null
}

export interface AuditActor {
  id: string | null
  name: string
  events: number
}

interface Paged {
  data: AuditEvent[]
  meta: { page: number; limit: number; total: number; last_page: number }
}

export interface AuditFilters {
  range: DateRange
  entities: AuditEntity[]
  actorId: string | null
  q: string
}

const PAGE = 30

export function auditParams(f: AuditFilters, page: number, limit = PAGE) {
  return {
    from: f.range.from,
    to: f.range.to,
    page,
    limit,
    ...(f.entities.length ? { entity: f.entities.join(',') } : {}),
    ...(f.actorId ? { actor_id: f.actorId } : {}),
    ...(f.q.trim() ? { q: f.q.trim() } : {}),
  }
}

export function useAuditLog(f: AuditFilters) {
  return useInfiniteQuery({
    queryKey: ['audit', f],
    queryFn: async ({ pageParam }) => (await api.get<Paged>('/analytics/audit-log', { params: auditParams(f, pageParam) })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  })
}

export function useAuditActors(range: DateRange) {
  return useQuery({
    queryKey: ['audit', 'actors', range],
    queryFn: async () => (await api.get<AuditActor[]>('/analytics/audit-log/actors', { params: range })).data ?? [],
    placeholderData: keepPreviousData,
  })
}

/** Todas las páginas (para exportar). */
export async function fetchAllAudit(f: AuditFilters): Promise<AuditEvent[]> {
  const out: AuditEvent[] = []
  for (let page = 1; page <= 100; page++) {
    const res = (await api.get<Paged>('/analytics/audit-log', { params: auditParams(f, page, 100) })).data
    out.push(...res.data)
    if (page >= res.meta.last_page) break
  }
  return out
}

/* ------------------------------- Redacción -------------------------------- */

export const ENTITY_LABEL: Record<AuditEntity, string> = {
  product: 'Producto',
  category: 'Categoría',
  promotion: 'Promoción',
  supply: 'Insumo',
  table: 'Mesa',
  invoice: 'Factura',
  cash_register: 'Caja',
  user: 'Usuario',
  invite: 'Invitación',
  settings: 'Configuración',
  reservation: 'Reserva',
}

/** Artículo + sustantivo para armar la frase ("el producto", "la mesa"). */
const NOUN: Record<AuditEntity, string> = {
  product: 'el producto',
  category: 'la categoría',
  promotion: 'la promoción',
  supply: 'el insumo',
  table: 'la mesa',
  invoice: 'la factura',
  cash_register: 'la caja',
  user: 'al usuario',
  invite: 'una invitación',
  settings: 'la configuración',
  reservation: 'la reserva',
}

const VERB: Record<string, string> = {
  create: 'creó',
  update: 'modificó',
  delete: 'eliminó',
  restore: 'restauró',
  restock: 'repuso',
  void: 'anuló',
  open: 'abrió',
  close: 'cerró',
  role_change: 'cambió el rol de',
  ban: 'bloqueó',
  unban: 'reactivó',
  email_change: 'cambió el correo de',
  password_change: 'cambió la contraseña de',
  invite: 'generó',
  cancel: 'canceló',
  no_show: 'marcó como no presentada',
  seat: 'sentó',
  complete: 'completó',
}

/** "modificó el producto Pique macho" (sin el nombre de quien lo hizo). */
export function describe(e: AuditEvent): string {
  const verb = VERB[e.action] ?? e.action
  const noun = e.action.endsWith('_change') ? (e.entity === 'user' ? '' : NOUN[e.entity]) : NOUN[e.entity]
  const label = e.entity === 'table' && e.entity_label ? e.entity_label : e.entity_label ? `"${e.entity_label}"` : ''
  if (e.entity === 'cash_register') return `${verb} la caja`
  if (e.entity === 'settings') return `${verb} la configuración${e.entity_label ? ` (${e.entity_label})` : ''}`
  if (e.entity === 'invoice') return `${verb} la factura N° ${e.entity_label ?? ''}`.trim()
  return [verb, noun, label].filter(Boolean).join(' ')
}

export const FIELD_LABEL: Record<string, string> = {
  name: 'Nombre',
  price: 'Precio',
  cost: 'Costo',
  cost_per_unit: 'Costo por unidad',
  fixed_cost: 'Costo extra',
  description: 'Descripción',
  category_id: 'Categoría',
  category: 'Categoría',
  is_active: 'Disponible',
  is_available: 'Disponible',
  track_stock: 'Controla stock',
  stock: 'Stock',
  min_stock: 'Stock mínimo',
  current_stock: 'Stock',
  min_stock_alert: 'Aviso de stock bajo',
  unit: 'Unidad',
  image_url: 'Foto',
  table_number: 'Número',
  capacity: 'Capacidad',
  value: 'Valor',
  pricing_type: 'Tipo de precio',
  start_date: 'Desde',
  end_date: 'Hasta',
  start_time: 'Hora de inicio',
  end_time: 'Hora de fin',
  days_of_week: 'Días',
  code: 'Código',
  max_uses: 'Usos máximos',
  starting_cash: 'Fondo inicial',
  closing_cash_count: 'Efectivo contado',
  difference: 'Diferencia',
  total_cash_sales: 'Ventas en efectivo',
  total_qr_sales: 'Ventas por QR',
  total_card_sales: 'Ventas con tarjeta',
  closed_by: 'Cerró',
  status: 'Estado',
  role: 'Rol',
  role_id: 'Rol',
  email: 'Correo',
  first_names: 'Nombres',
  last_names: 'Apellidos',
  phone: 'Teléfono',
  is_banned: 'Bloqueado',
  password: 'Contraseña',
  customer_name: 'Cliente',
  party_size: 'Personas',
  reserved_at: 'Fecha y hora',
  table_id: 'Mesa',
  notes: 'Notas',
  address: 'Dirección',
  nit: 'NIT',
  legend_law: 'Leyenda',
  accent_color: 'Color de marca',
  logo_url: 'Logo',
  favicon_url: 'Ícono',
  qr_image_url: 'QR de cobro',
  auto_close_time: 'Cierre automático',
  enable_auto_close: 'Cierre automático activo',
  block_sale_on_low_supply: 'Bloquear venta sin insumos',
}

const MONEY_FIELDS = /price|cost|cash|difference|sales|value|total|amount/i
const STATUS: Record<string, string> = { open: 'Abierta', closed: 'Cerrada', pending: 'Pendiente', seated: 'En mesa', completed: 'Completada', cancelled: 'Cancelada', no_show: 'No se presentó' }

export function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'vacío'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return String(o.name ?? o.label ?? JSON.stringify(v))
  }
  if (field === 'status' && typeof v === 'string') return STATUS[v] ?? v
  if (MONEY_FIELDS.test(field) && !Number.isNaN(Number(v))) return formatMoney(v)
  if (/_at$|_date$/.test(field) && typeof v === 'string' && !Number.isNaN(Date.parse(v))) {
    return new Date(v).toLocaleString('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'short' })
  }
  return String(v)
}
