export interface KitchenTicketData {
  /** "Mesa 4" o "Para llevar: Ana". */
  place: string
  batch: number
  sentAt: string
  printedAt: string
  waiter?: string | null
  lines: { key: string; qty: number; name: string; notes?: string | null; parts: { key: string; qty: number; name: string }[] }[]
}

const hm = (value: string | number | Date) =>
  new Date(value).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Comanda para cocina: lo que hay que preparar, grande y sin precios. */
export function KitchenTicket({ data }: { data: KitchenTicketData }) {
  const units = data.lines.reduce((s, l) => s + l.qty, 0)
  return (
    <article className="ticket ticket-kitchen" aria-label={`Comanda ${data.place}`}>
      <header className="ticket-center">
        <p className="ticket-small">Comanda · tanda {data.batch}</p>
        <p className="ticket-place">{data.place}</p>
      </header>
      <dl className="ticket-kv">
        <div><dt>Enviado</dt><dd>{hm(data.sentAt)}</dd></div>
        {data.waiter && <div><dt>Atiende</dt><dd>{data.waiter}</dd></div>}
        <div><dt>Unidades</dt><dd>{units}</dd></div>
      </dl>
      <hr className="ticket-rule" />
      {data.lines.map((l) => (
        <div key={l.key} className="ticket-kitem">
          <span className="ticket-kqty">{l.qty}</span>
          <div className="ticket-kbody">
            <p className="ticket-kname">{l.name}</p>
            {l.parts.map((p) => (
              <p key={p.key} className="ticket-kpart">+ {p.qty} {p.name}</p>
            ))}
            {l.notes && <p className="ticket-knote">{l.notes}</p>}
          </div>
        </div>
      ))}
      <hr className="ticket-rule" />
      <p className="ticket-center ticket-small">Impreso {hm(data.printedAt)}</p>
    </article>
  )
}
