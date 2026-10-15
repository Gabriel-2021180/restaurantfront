import { QRCodeSVG } from 'qrcode.react'
import { toNumber } from '@/lib/format'

/** Respuesta de GET /finance/invoices/:id (invoices_get). */
export interface InvoiceFull {
  id: string
  invoice_number: number | string
  authorization_code?: string | null
  nit_emisor?: string | null
  client_nit?: string | null
  client_name?: string | null
  transaction_date: string
  total_amount: number | string
  literal_amount?: string | null
  legend_law?: string | null
  legend_rights?: string | null
  is_annulled?: boolean
  annulment_reason?: string | null
  is_partial?: boolean
  amount_received?: number | string | null
  change?: number | string | null
  payments?: { method: string; amount: number | string }[]
  items?: { detail_id: string; product_name: string; quantity: number; amount: number | string }[]
  order?: {
    table?: { table_number?: string | number } | null
    client_name?: string | null
    details?: {
      id: string
      product_name?: string | null
      name?: string | null
      quantity: number
      price_at_purchase: number | string
      discount_amount?: number | string | null
      parent_detail_id?: string | null
    }[]
  } | null
  createdBy?: { first_names?: string } | null
  business_config?: { name?: string | null; address?: string | null; phone?: string | null; logo_url?: string | null } | null
}

const money = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const m = (v: unknown) => money.format(toNumber(v))

const METHOD: Record<string, string> = { EFECTIVO: 'Efectivo', QR: 'QR', TARJETA: 'Tarjeta' }

function dateTime(value: string) {
  const d = new Date(value)
  const date = d.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  return `${date} ${time}`
}

interface Line {
  key: string
  qty: number
  name: string
  unit: number
  amount: number
  parts: { key: string; qty: number; name: string }[]
}

/**
 * Lo que cubre esta factura:
 * - dividida por ítems: solo esos ítems (invoice.items);
 * - dividida por monto: una sola línea por el monto cobrado;
 * - completa: el detalle de la orden, combos con sus partes y descuentos aparte.
 */
function linesOf(inv: InvoiceFull): { lines: Line[]; discount: number } {
  if (inv.items?.length) {
    return {
      discount: 0,
      lines: inv.items.map((it) => ({
        key: it.detail_id,
        qty: it.quantity,
        name: it.product_name,
        unit: toNumber(it.amount) / Math.max(1, it.quantity),
        amount: toNumber(it.amount),
        parts: [],
      })),
    }
  }
  const details = inv.order?.details ?? []
  if (inv.is_partial || details.length === 0) {
    return { discount: 0, lines: [{ key: 'part', qty: 1, name: inv.is_partial ? 'Consumo (pago parcial de la cuenta)' : 'Consumo', unit: toNumber(inv.total_amount), amount: toNumber(inv.total_amount), parts: [] }] }
  }
  const parents = details.filter((d) => !d.parent_detail_id)
  return {
    discount: details.reduce((s, d) => s + toNumber(d.discount_amount), 0),
    lines: parents.map((d) => ({
      key: d.id,
      qty: d.quantity,
      name: d.product_name ?? d.name ?? 'Producto',
      unit: toNumber(d.price_at_purchase),
      amount: toNumber(d.price_at_purchase) * d.quantity,
      parts: details.filter((c) => c.parent_detail_id === d.id).map((c) => ({ key: c.id, qty: c.quantity, name: c.product_name ?? c.name ?? '' })),
    })),
  }
}

/** Ticket de factura para impresora térmica (58 u 80 mm). El mismo componente sirve de vista previa. */
export function InvoiceTicket({ invoice: inv }: { invoice: InvoiceFull }) {
  const c = inv.business_config ?? {}
  const { lines, discount } = linesOf(inv)
  const total = toNumber(inv.total_amount)
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const payments = inv.payments ?? []
  const received = toNumber(inv.amount_received)
  const change = toNumber(inv.change)
  const table = inv.order?.table?.table_number
  const qr = `https://siat.impuestos.gob.bo/consulta/QR?nit=${inv.nit_emisor ?? ''}&cuf=${inv.authorization_code ?? ''}&numero=${inv.invoice_number}&t=${total.toFixed(2)}`

  return (
    <article className="ticket" aria-label={`Factura ${inv.invoice_number}`}>
      <header className="ticket-center">
        {c.logo_url && <img className="ticket-logo" src={c.logo_url} alt="" />}
        <p className="ticket-title">{c.name || 'Restaurante'}</p>
        <p>Casa matriz</p>
        {c.address && <p>{c.address}</p>}
        {c.phone && <p>Tel. {c.phone}</p>}
      </header>

      <hr className="ticket-rule" />
      <div className="ticket-center">
        <p className="ticket-heading">Factura</p>
        <p className="ticket-small">(Con derecho a crédito fiscal)</p>
      </div>
      {inv.is_annulled && (
        <p className="ticket-void">
          Anulada{inv.annulment_reason ? `: ${inv.annulment_reason}` : ''}
        </p>
      )}
      <dl className="ticket-kv">
        <div><dt>NIT</dt><dd>{inv.nit_emisor || '-'}</dd></div>
        <div><dt>Factura N°</dt><dd>{inv.invoice_number}</dd></div>
      </dl>
      {inv.authorization_code && (
        <>
          <p className="ticket-small">Cód. autorización</p>
          <p className="ticket-code">{inv.authorization_code}</p>
        </>
      )}

      <hr className="ticket-rule" />
      <dl className="ticket-kv">
        <div><dt>Fecha</dt><dd>{dateTime(inv.transaction_date)}</dd></div>
        <div><dt>Señor(es)</dt><dd>{inv.client_name || 'Sin nombre'}</dd></div>
        <div><dt>NIT/CI</dt><dd>{inv.client_nit || '0'}</dd></div>
        {table != null && <div><dt>Mesa</dt><dd>{table}</dd></div>}
        {inv.createdBy?.first_names && <div><dt>Cajero</dt><dd>{inv.createdBy.first_names.split(' ')[0]}</dd></div>}
      </dl>

      <hr className="ticket-rule" />
      <div className="ticket-row ticket-strong">
        <span className="ticket-qty">Cant</span>
        <span className="ticket-name">Detalle</span>
        <span className="ticket-amount">Importe</span>
      </div>
      {lines.map((l) => (
        <div key={l.key} className="ticket-item">
          <div className="ticket-row">
            <span className="ticket-qty">{l.qty}</span>
            <span className="ticket-name">{l.name}</span>
            <span className="ticket-amount">{m(l.amount)}</span>
          </div>
          {l.qty > 1 && <p className="ticket-sub">{m(l.unit)} c/u</p>}
          {l.parts.map((p) => (
            <p key={p.key} className="ticket-sub">+ {p.qty} {p.name}</p>
          ))}
        </div>
      ))}

      <hr className="ticket-rule" />
      {discount > 0.005 && (
        <>
          <div className="ticket-row"><span>Subtotal</span><span>{m(subtotal)}</span></div>
          <div className="ticket-row"><span>Descuentos</span><span>-{m(discount)}</span></div>
        </>
      )}
      <div className="ticket-row ticket-total">
        <span>Total Bs</span>
        <span>{m(total)}</span>
      </div>
      {inv.literal_amount && <p className="ticket-small">Son: {inv.literal_amount}</p>}

      {payments.length > 0 && (
        <>
          <hr className="ticket-rule ticket-rule-light" />
          {payments.map((p, i) => (
            <div key={i} className="ticket-row"><span>{METHOD[p.method] ?? p.method}</span><span>{m(p.amount)}</span></div>
          ))}
          {received > 0 && <div className="ticket-row"><span>Recibido</span><span>{m(received)}</span></div>}
          {change > 0.005 && <div className="ticket-row ticket-strong"><span>Cambio</span><span>{m(change)}</span></div>}
        </>
      )}

      <hr className="ticket-rule" />
      <footer className="ticket-center">
        <QRCodeSVG value={qr} size={112} marginSize={0} className="ticket-qr" />
        {inv.legend_law && <p className="ticket-small">{inv.legend_law}</p>}
        <p className="ticket-legal">
          Esta factura contribuye al desarrollo del país. El uso ilícito será sancionado penalmente de acuerdo a ley.
        </p>
        {inv.legend_rights && <p className="ticket-legal">{inv.legend_rights}</p>}
        <p className="ticket-thanks">Gracias por su visita</p>
      </footer>
    </article>
  )
}
