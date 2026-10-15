import api from '@/lib/api/client'
import { describe, ENTITY_LABEL, FIELD_LABEL, fetchAllAudit, formatValue } from '@/features/audit/api'
import type { DateRange } from '@/lib/date-range'
import { toNumber } from '@/lib/format'
import type { CashSession } from '@/types/finance'
import type { Reservation } from '@/types/reservation'

/**
 * Informes exportables. Cada informe es una lista de tablas (hojas en Excel, secciones en PDF)
 * con columnas tipadas: así Excel recibe números y fechas reales y se puede sumar, filtrar y validar.
 */
export type ColumnType = 'text' | 'int' | 'decimal' | 'money' | 'percent' | 'datetime' | 'date'

export interface Column {
  key: string
  label: string
  type?: ColumnType
  /** Ancho aproximado en caracteres (Excel). */
  width?: number
}

export type Row = Record<string, string | number | null | undefined>

export interface ReportTable {
  title: string
  note?: string
  columns: Column[]
  rows: Row[]
  /** Columnas a sumar en la fila de totales. */
  totals?: string[]
}

export interface ReportData {
  title: string
  /** Cifras clave que encabezan el informe. */
  summary?: { label: string; value: string | number; type?: ColumnType }[]
  tables: ReportTable[]
}

export type ReportId = 'sales' | 'cash' | 'products' | 'inventory' | 'staff' | 'reservations' | 'audit'

const get = async <T>(url: string, params?: object) => (await api.get<T>(url, { params })).data
const list = <T>(d: T[] | { data: T[] } | null | undefined): T[] => (Array.isArray(d) ? d : (d?.data ?? []))
const fullName = (u?: { first_names?: string; last_names?: string } | null) => [u?.first_names, u?.last_names].filter(Boolean).join(' ') || null

const METHOD: Record<string, string> = { EFECTIVO: 'Efectivo', QR: 'QR', TARJETA: 'Tarjeta', MIXTO: 'Mixto' }
const RES_STATUS: Record<string, string> = { pending: 'Pendiente', seated: 'En mesa', completed: 'Completada', cancelled: 'Cancelada', no_show: 'No se presentó' }

interface InvoiceRow {
  invoice_number: number | string
  client_name: string | null
  client_nit: string | null
  transaction_date: string
  total_amount: number | string
  is_annulled: boolean
  annulment_reason?: string | null
  payment_method?: string | null
  order_identifier?: string | null
}

/** Todas las facturas del rango: la API pagina de a 100 como máximo. */
async function allInvoices(range: DateRange): Promise<InvoiceRow[]> {
  const out: InvoiceRow[] = []
  for (let page = 1; page <= 200; page++) {
    const res = await get<{ data: InvoiceRow[]; meta: { last_page: number } }>('/finance/invoices', { from: range.from, to: range.to, page, limit: 100 })
    out.push(...res.data)
    if (page >= (res.meta?.last_page ?? 1)) break
  }
  return out
}

async function sales(range: DateRange): Promise<ReportData> {
  const [invoices, daily, kpi] = await Promise.all([
    allInvoices(range),
    get<{ grand_total: number; breakdown: { method: string; count: number; total: number }[] }>('/finance/invoices/report/daily', range),
    get<{ total_revenue: number; net_profit: number; average_ticket: number; profit_margin: number }>('/analytics/dashboard-kpi', range).catch(() => null),
  ])
  const valid = invoices.filter((i) => !i.is_annulled)
  const voided = invoices.length - valid.length
  return {
    title: 'Ventas y facturación',
    summary: [
      { label: 'Total facturado (vigente)', value: valid.reduce((s, i) => s + toNumber(i.total_amount), 0), type: 'money' },
      { label: 'Facturas vigentes', value: valid.length, type: 'int' },
      { label: 'Facturas anuladas', value: voided, type: 'int' },
      ...(kpi
        ? [
            { label: 'Ganancia neta', value: toNumber(kpi.net_profit), type: 'money' as const },
            { label: 'Ticket promedio', value: toNumber(kpi.average_ticket), type: 'money' as const },
            { label: 'Margen', value: toNumber(kpi.profit_margin) / 100, type: 'percent' as const },
          ]
        : []),
    ],
    tables: [
      {
        title: 'Cobros por método de pago',
        note: 'Solo facturas vigentes.',
        columns: [
          { key: 'method', label: 'Método', width: 16 },
          { key: 'count', label: 'Facturas', type: 'int', width: 12 },
          { key: 'total', label: 'Total', type: 'money', width: 16 },
        ],
        rows: (daily?.breakdown ?? []).map((b) => ({ method: METHOD[b.method] ?? b.method, count: toNumber(b.count), total: toNumber(b.total) })),
        totals: ['count', 'total'],
      },
      {
        title: 'Detalle de facturas',
        columns: [
          { key: 'number', label: 'N°', width: 9 },
          { key: 'date', label: 'Fecha y hora', type: 'datetime', width: 18 },
          { key: 'client', label: 'Cliente', width: 26 },
          { key: 'nit', label: 'NIT/CI', width: 14 },
          { key: 'origin', label: 'Origen', width: 22 },
          { key: 'method', label: 'Pago', width: 12 },
          { key: 'total', label: 'Total', type: 'money', width: 14 },
          { key: 'status', label: 'Estado', width: 11 },
          { key: 'reason', label: 'Motivo de anulación', width: 30 },
        ],
        rows: invoices.map((i) => ({
          number: String(i.invoice_number),
          date: i.transaction_date,
          client: i.client_name || 'Sin nombre',
          nit: i.client_nit || '0',
          origin: i.order_identifier ?? '',
          method: i.payment_method ? (METHOD[i.payment_method] ?? i.payment_method) : '',
          total: toNumber(i.total_amount),
          status: i.is_annulled ? 'Anulada' : 'Vigente',
          reason: i.annulment_reason ?? '',
        })),
      },
    ],
  }
}

async function cash(range: DateRange): Promise<ReportData> {
  const shifts = await get<CashSession[]>('/finance/cash-register/daily-shifts', range)
  const rows = shifts ?? []
  const breakdown = rows.flatMap((s) =>
    (s.breakdown ?? []).map((b) => ({
      opened: s.opened_at,
      method: METHOD[b.method] ?? b.method,
      expected: toNumber(b.expected),
      counted: b.counted == null ? null : toNumber(b.counted),
      difference: b.difference == null ? null : toNumber(b.difference),
    })),
  )
  return {
    title: 'Cierres de caja',
    summary: [
      { label: 'Turnos', value: rows.length, type: 'int' },
      { label: 'Turnos con diferencia', value: rows.filter((s) => Math.abs(toNumber(s.difference)) > 0.005).length, type: 'int' },
      { label: 'Diferencia acumulada', value: rows.reduce((t, s) => t + toNumber(s.difference), 0), type: 'money' },
    ],
    tables: [
      {
        title: 'Turnos de caja',
        columns: [
          { key: 'opened', label: 'Apertura', type: 'datetime', width: 18 },
          { key: 'openedBy', label: 'Abrió', width: 20 },
          { key: 'closed', label: 'Cierre', type: 'datetime', width: 18 },
          { key: 'closedBy', label: 'Cerró', width: 20 },
          { key: 'starting', label: 'Fondo inicial', type: 'money', width: 14 },
          { key: 'counted', label: 'Efectivo contado', type: 'money', width: 16 },
          { key: 'difference', label: 'Diferencia', type: 'money', width: 14 },
          { key: 'status', label: 'Estado', width: 10 },
          { key: 'notes', label: 'Observaciones', width: 30 },
        ],
        rows: rows.map((s) => ({
          opened: s.opened_at,
          openedBy: fullName(s.openedBy),
          closed: s.closed_at,
          closedBy: fullName(s.closedBy),
          starting: toNumber(s.starting_cash),
          counted: s.closing_cash_count == null ? null : toNumber(s.closing_cash_count),
          difference: s.difference == null ? null : toNumber(s.difference),
          status: s.status === 'open' ? 'Abierta' : 'Cerrada',
          notes: s.notes ?? '',
        })),
        totals: ['difference'],
      },
      ...(breakdown.length
        ? [
            {
              title: 'Arqueo por método',
              columns: [
                { key: 'opened', label: 'Turno (apertura)', type: 'datetime' as const, width: 18 },
                { key: 'method', label: 'Método', width: 12 },
                { key: 'expected', label: 'Esperado', type: 'money' as const, width: 14 },
                { key: 'counted', label: 'Contado', type: 'money' as const, width: 14 },
                { key: 'difference', label: 'Diferencia', type: 'money' as const, width: 14 },
              ],
              rows: breakdown,
              totals: ['expected', 'counted', 'difference'],
            },
          ]
        : []),
    ],
  }
}

async function products(range: DateRange): Promise<ReportData> {
  type Ranked = { name: string; sold: number; revenue: number; profit?: number }
  type Promo = { name: string; kind: string; code: string | null; uses: number; units: number; revenue: number; discount_given: number }
  const [top, profit, promos] = await Promise.all([
    get<Ranked[]>('/analytics/top-products', { ...range, limit: 100 }),
    get<Ranked[]>('/analytics/top-profitable', { ...range, limit: 100 }),
    get<Promo[]>('/analytics/promotions', range).catch(() => [] as Promo[]),
  ])
  return {
    title: 'Productos y promociones',
    tables: [
      {
        title: 'Productos más vendidos',
        columns: [
          { key: 'name', label: 'Producto', width: 30 },
          { key: 'sold', label: 'Unidades', type: 'int', width: 12 },
          { key: 'revenue', label: 'Ingresos', type: 'money', width: 16 },
        ],
        rows: list(top).map((r) => ({ name: r.name, sold: toNumber(r.sold), revenue: toNumber(r.revenue) })).sort((a, b) => b.sold - a.sold),
        totals: ['sold', 'revenue'],
      },
      {
        title: 'Productos más rentables',
        columns: [
          { key: 'name', label: 'Producto', width: 30 },
          { key: 'sold', label: 'Unidades', type: 'int', width: 12 },
          { key: 'revenue', label: 'Ingresos', type: 'money', width: 16 },
          { key: 'profit', label: 'Ganancia neta', type: 'money', width: 16 },
        ],
        rows: list(profit).map((r) => ({ name: r.name, sold: toNumber(r.sold), revenue: toNumber(r.revenue), profit: toNumber(r.profit) })).sort((a, b) => b.profit - a.profit),
        totals: ['sold', 'revenue', 'profit'],
      },
      {
        title: 'Promociones',
        columns: [
          { key: 'name', label: 'Promoción', width: 28 },
          { key: 'kind', label: 'Tipo', width: 12 },
          { key: 'code', label: 'Código', width: 12 },
          { key: 'uses', label: 'Usos', type: 'int', width: 10 },
          { key: 'units', label: 'Unidades', type: 'int', width: 10 },
          { key: 'revenue', label: 'Ingresos', type: 'money', width: 14 },
          { key: 'discount', label: 'Descuento otorgado', type: 'money', width: 18 },
        ],
        rows: list(promos).map((p) => ({
          name: p.name,
          kind: p.kind === 'bundle' ? 'Combo' : 'Descuento',
          code: p.code ?? '',
          uses: toNumber(p.uses),
          units: toNumber(p.units),
          revenue: toNumber(p.revenue),
          discount: toNumber(p.discount_given),
        })),
        totals: ['uses', 'units', 'revenue', 'discount'],
      },
    ],
  }
}

async function inventory(): Promise<ReportData> {
  type Supply = { name: string; unit: string; cost_per_unit: number; current_stock: number; min_stock_alert: number }
  const supplies = list(await get<Supply[]>('/inventory/supplies'))
  // GRAMO se informa en kg, igual que en la pantalla de Insumos.
  const rows = supplies
    .map((s) => {
      const kg = s.unit === 'GRAMO'
      const stock = toNumber(s.current_stock) / (kg ? 1000 : 1)
      const min = toNumber(s.min_stock_alert) / (kg ? 1000 : 1)
      const cost = toNumber(s.cost_per_unit) * (kg ? 1000 : 1)
      return {
        name: s.name,
        unit: kg ? 'kg' : 'unidad',
        stock,
        min,
        cost,
        value: stock * cost,
        status: stock <= 0 ? 'Agotado' : stock <= min ? 'Por reponer' : 'Suficiente',
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return {
    title: 'Inventario de insumos',
    summary: [
      { label: 'Insumos', value: rows.length, type: 'int' },
      { label: 'Por reponer o agotados', value: rows.filter((r) => r.status !== 'Suficiente').length, type: 'int' },
      { label: 'Valor del inventario', value: rows.reduce((s, r) => s + r.value, 0), type: 'money' },
    ],
    tables: [
      {
        title: 'Existencias',
        note: 'Foto del stock al momento de generar el informe (no depende del rango de fechas).',
        columns: [
          { key: 'name', label: 'Insumo', width: 30 },
          { key: 'unit', label: 'Unidad', width: 9 },
          { key: 'stock', label: 'Stock', type: 'decimal', width: 10 },
          { key: 'min', label: 'Mínimo', type: 'decimal', width: 10 },
          { key: 'cost', label: 'Costo por unidad', type: 'money', width: 16 },
          { key: 'value', label: 'Valor en stock', type: 'money', width: 16 },
          { key: 'status', label: 'Estado', width: 13 },
        ],
        rows: rows.map((r) => ({ ...r, stock: Number(r.stock.toFixed(3)), min: Number(r.min.toFixed(3)) })),
        totals: ['value'],
      },
    ],
  }
}

async function staff(range: DateRange): Promise<ReportData> {
  type Team = {
    waiters: { full_name: string; tables_served: number; sales_generated: string | number }[]
    cashiers: { full_name: string; invoices: number; collected: string | number; pickups_handled: number }[]
    admins: { full_name: string; pickups_created: number; pickup_sales: string | number }[]
  }
  const team = await get<Team>('/analytics/performance-global', range)
  return {
    title: 'Desempeño del personal',
    tables: [
      {
        title: 'Meseros',
        columns: [
          { key: 'name', label: 'Mesero', width: 28 },
          { key: 'tables', label: 'Mesas atendidas', type: 'int', width: 16 },
          { key: 'sales', label: 'Ventas generadas', type: 'money', width: 18 },
        ],
        rows: (team?.waiters ?? []).map((w) => ({ name: w.full_name, tables: toNumber(w.tables_served), sales: toNumber(w.sales_generated) })),
        totals: ['tables', 'sales'],
      },
      {
        title: 'Cajeros',
        columns: [
          { key: 'name', label: 'Cajero', width: 28 },
          { key: 'invoices', label: 'Facturas', type: 'int', width: 12 },
          { key: 'collected', label: 'Cobrado', type: 'money', width: 16 },
          { key: 'pickups', label: 'Para llevar', type: 'int', width: 12 },
        ],
        rows: (team?.cashiers ?? []).map((c) => ({ name: c.full_name, invoices: toNumber(c.invoices), collected: toNumber(c.collected), pickups: toNumber(c.pickups_handled) })),
        totals: ['invoices', 'collected', 'pickups'],
      },
      {
        title: 'Administradores',
        columns: [
          { key: 'name', label: 'Administrador', width: 28 },
          { key: 'pickups', label: 'Para llevar creados', type: 'int', width: 18 },
          { key: 'sales', label: 'Ventas para llevar', type: 'money', width: 18 },
        ],
        rows: (team?.admins ?? []).map((a) => ({ name: a.full_name, pickups: toNumber(a.pickups_created), sales: toNumber(a.pickup_sales) })),
        totals: ['pickups', 'sales'],
      },
    ],
  }
}

async function reservations(range: DateRange): Promise<ReportData> {
  const rows = list(await get<Reservation[]>('/reservations', range)).sort((a, b) => a.reserved_at.localeCompare(b.reserved_at))
  const count = (s: string) => rows.filter((r) => r.status === s).length
  return {
    title: 'Reservas',
    summary: [
      { label: 'Reservas', value: rows.length, type: 'int' },
      { label: 'Atendidas', value: count('seated') + count('completed'), type: 'int' },
      { label: 'Canceladas', value: count('cancelled'), type: 'int' },
      { label: 'No se presentaron', value: count('no_show'), type: 'int' },
    ],
    tables: [
      {
        title: 'Detalle de reservas',
        columns: [
          { key: 'at', label: 'Fecha y hora', type: 'datetime', width: 18 },
          { key: 'customer', label: 'Cliente', width: 24 },
          { key: 'phone', label: 'Teléfono', width: 13 },
          { key: 'party', label: 'Personas', type: 'int', width: 10 },
          { key: 'table', label: 'Mesa', width: 8 },
          { key: 'status', label: 'Estado', width: 15 },
          { key: 'by', label: 'Registró', width: 18 },
          { key: 'notes', label: 'Notas', width: 30 },
        ],
        rows: rows.map((r) => ({
          at: r.reserved_at,
          customer: r.customer_name,
          phone: r.customer_phone ?? '',
          party: r.party_size,
          table: r.table?.number ?? '',
          status: RES_STATUS[r.status] ?? r.status,
          by: r.created_by?.name ?? '',
          notes: r.notes ?? '',
        })),
        totals: ['party'],
      },
    ],
  }
}

async function audit(range: DateRange): Promise<ReportData> {
  const events = await fetchAllAudit({ range, entities: [], actorId: null, q: '' })
  return {
    title: 'Registro de actividad',
    summary: [
      { label: 'Eventos', value: events.length, type: 'int' },
      { label: 'Eliminaciones y anulaciones', value: events.filter((e) => e.action === 'delete' || e.action === 'void').length, type: 'int' },
    ],
    tables: [
      {
        title: 'Actividad',
        columns: [
          { key: 'at', label: 'Fecha y hora', type: 'datetime', width: 18 },
          { key: 'actor', label: 'Persona', width: 20 },
          { key: 'role', label: 'Rol', width: 14 },
          { key: 'entity', label: 'Tipo', width: 13 },
          { key: 'what', label: 'Acción', width: 40 },
          { key: 'changes', label: 'Cambios', width: 50 },
          { key: 'reason', label: 'Motivo', width: 28 },
        ],
        rows: events.map((e) => ({
          at: e.at,
          actor: e.actor.name,
          role: e.actor.role ?? '',
          entity: ENTITY_LABEL[e.entity] ?? e.entity,
          what: describe(e),
          changes: e.changes
            .map((c) => `${FIELD_LABEL[c.field] ?? c.field}: ${c.redacted ? 'cambiada' : `${formatValue(c.field, c.before)} -> ${formatValue(c.field, c.after)}`}`)
            .join('; '),
          reason: e.reason ?? '',
        })),
      },
    ],
  }
}

export const REPORTS: Record<ReportId, (range: DateRange) => Promise<ReportData>> = {
  audit,
  sales,
  cash,
  products,
  inventory: () => inventory(),
  staff,
  reservations,
}
