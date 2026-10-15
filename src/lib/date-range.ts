import { addDaysISO, todayISO } from './format'

export interface DateRange {
  from: string
  to: string
}

export type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'

export function presetRange(p: Exclude<RangePreset, 'custom'>): DateRange {
  const today = todayISO()
  switch (p) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = addDaysISO(today, -1)
      return { from: y, to: y }
    }
    case 'week':
      return { from: addDaysISO(today, -6), to: today }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today }
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
}
