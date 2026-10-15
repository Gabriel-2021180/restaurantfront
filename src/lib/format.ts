/** Formatos de Bolivia: moneda Bs y hora de La Paz. */
export const TIME_ZONE = 'America/La_Paz'

const moneyFmt = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : 0
}

/** 1284.5 -> "Bs 1.284,50" */
export function formatMoney(value: unknown): string {
  return `Bs ${moneyFmt.format(toNumber(value))}`
}

/** Fecha de hoy en La Paz como YYYY-MM-DD (no usar toISOString: es UTC). */
export function todayISO(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date)
}

export function formatTime(value: string | number | Date, locale = 'es-BO'): string {
  return new Date(value).toLocaleTimeString(locale, { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

export function formatDate(value: string | number | Date, locale = 'es-BO'): string {
  return new Date(value).toLocaleDateString(locale, { timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric' })
}

/** 'YYYY-MM-DD' (fecha pura de la API) -> fecha legible, sin corrimiento de zona. */
export function formatPlainDate(value: string, locale = 'es-BO'): string {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' })
}

/** Tiempo transcurrido corto: "8 min", "1 h 12 min". */
export function formatElapsed(since: string | number | Date, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Suma días a una fecha 'YYYY-MM-DD' sin problemas de zona horaria. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** Bolivia no cambia de horario: La Paz siempre está en UTC-4. */
export const LA_PAZ_OFFSET = '-04:00'

/** Hora local de La Paz en formato 24 h "HH:mm" (para inputs type="time"). */
export function localTimeHM(value: string | number | Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value))
}

/** Fecha 'YYYY-MM-DD' + hora 'HH:mm' de La Paz -> ISO con zona, como lo pide la API. */
export function toLaPazISO(date: string, time: string): string {
  return `${date}T${time}:00${LA_PAZ_OFFSET}`
}

/** 'YYYY-MM-DD' -> "lun 13", "mar 14"... */
export function formatDayChip(iso: string, locale = 'es-BO'): { weekday: string; day: string; month: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return {
    weekday: dt.toLocaleDateString(locale, { timeZone: 'UTC', weekday: 'short' }).replace('.', ''),
    day: String(d),
    month: dt.toLocaleDateString(locale, { timeZone: 'UTC', month: 'short' }).replace('.', ''),
  }
}
