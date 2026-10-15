import { TIME_ZONE, formatMoney, formatPlainDate, todayISO } from '@/lib/format'
import type { Promotion } from '@/types/menu'

export const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const

export type PromoStatus = 'live' | 'scheduled' | 'off_hours' | 'expired' | 'exhausted' | 'paused'

export const STATUS_META: Record<PromoStatus, { label: string; tone: 'success' | 'info' | 'warning' | 'muted' | 'destructive' }> = {
  live: { label: 'Activa ahora', tone: 'success' },
  off_hours: { label: 'Fuera de horario', tone: 'info' },
  scheduled: { label: 'Programada', tone: 'info' },
  exhausted: { label: 'Agotada', tone: 'warning' },
  expired: { label: 'Vencida', tone: 'muted' },
  paused: { label: 'Pausada', tone: 'muted' },
}

function nowInLaPaz() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { date: todayISO(), day, time: `${get('hour')}:${get('minute')}` }
}

function inTimeWindow(time: string, start: string | null, end: string | null) {
  if (!start || !end) return true
  return start <= end ? time >= start && time < end : time >= start || time < end
}

export function promoStatus(p: Promotion): PromoStatus {
  if (!p.is_active) return 'paused'
  const now = nowInLaPaz()
  if (p.end_date && now.date > p.end_date.slice(0, 10)) return 'expired'
  if (p.max_uses != null && p.uses >= p.max_uses) return 'exhausted'
  if (p.start_date && now.date < p.start_date.slice(0, 10)) return 'scheduled'
  const dayOk = !p.days_of_week?.length || p.days_of_week.includes(now.day)
  return dayOk && inTimeWindow(now.time, p.start_time, p.end_time) ? 'live' : 'off_hours'
}

/** "Bs 150,00 (antes Bs 178,00)", "20% de descuento", "2x1"... */
export function pricingLabel(p: Pick<Promotion, 'kind' | 'pricing_type' | 'value' | 'price' | 'base_price'>) {
  switch (p.pricing_type) {
    case 'fixed_price':
      return formatMoney(p.price ?? p.value)
    case 'percent_off':
      return `${Number(p.value)}% de descuento`
    case 'amount_off':
      return `${formatMoney(p.value)} de descuento`
    case 'two_for_one':
      return '2x1'
  }
}

export function itemsLabel(p: Promotion) {
  if (p.kind === 'bundle') return p.items.map((i) => `${i.quantity} ${i.product?.name ?? 'producto'}`).join(' + ')
  return p.targets.map((t) => t.name).join(', ')
}

export function scheduleLabel(p: Promotion) {
  const parts: string[] = []
  if (p.start_date && p.end_date) parts.push(`${formatPlainDate(p.start_date)} – ${formatPlainDate(p.end_date)}`)
  else if (p.end_date) parts.push(`Hasta ${formatPlainDate(p.end_date)}`)
  else if (p.start_date) parts.push(`Desde ${formatPlainDate(p.start_date)}`)
  if (p.days_of_week?.length && p.days_of_week.length < 7) parts.push([...p.days_of_week].sort().map((d) => DAY_LABELS[d]).join(', '))
  if (p.start_time && p.end_time) parts.push(`${p.start_time}–${p.end_time}`)
  return parts.join(' · ') || 'Siempre'
}
