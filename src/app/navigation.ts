import type { LucideIcon } from 'lucide-react'
import {
  Award,
  ChefHat,
  Clock,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  TrendingUp,
  UtensilsCrossed,
  Users,
  CalendarClock,
} from 'lucide-react'
import type { SystemRole } from '@/types/auth'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  roles: SystemRole[]
  /** Solo los roles listados, sin el pase del super-admin. */
  strict?: boolean
}

export interface NavGroup {
  labelKey: string
  items: NavItem[]
}

/**
 * Única fuente de verdad del menú: rutas, íconos y quién las ve.
 * Matriz aprobada por el dueño (2026-10-05); la API aplica los mismos permisos.
 * El super-admin (dueño) entra a todo salvo lo marcado `strict` (propinas).
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: 'shell.groups.service',
    items: [
      { to: '/tables', labelKey: 'nav.tables', icon: LayoutGrid, roles: ['admin', 'waiter'] },
      { to: '/reservations', labelKey: 'nav.reservations', icon: CalendarClock, roles: ['admin', 'waiter', 'cashier'] },
      { to: '/pickup', labelKey: 'nav.takeaway', icon: ShoppingBag, roles: ['admin', 'cashier', 'waiter'] },
      { to: '/kitchen', labelKey: 'nav.kitchen_monitor', icon: ChefHat, roles: ['admin', 'cashier', 'chef'] },
      { to: '/cashier', labelKey: 'nav.cash_register', icon: Receipt, roles: ['admin', 'cashier'] },
    ],
  },
  {
    labelKey: 'shell.groups.sales',
    items: [
      { to: '/', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['admin'] },
      { to: '/admin/report', labelKey: 'nav.summary', icon: TrendingUp, roles: ['admin'] },
      { to: '/my-shift', labelKey: 'shell.nav.myShift', icon: TrendingUp, roles: ['cashier'], strict: true },
      { to: '/admin/invoices', labelKey: 'nav.invoices', icon: FileText, roles: ['admin', 'cashier'] },
      { to: '/admin/shifts', labelKey: 'shell.nav.shifts', icon: Clock, roles: ['admin'] },
      { to: '/reports', labelKey: 'nav.reports', icon: FileSpreadsheet, roles: ['admin'] },
    ],
  },
  {
    labelKey: 'shell.groups.menu',
    items: [
      { to: '/products', labelKey: 'nav.products', icon: UtensilsCrossed, roles: ['admin'] },
      { to: '/categories', labelKey: 'nav.categories', icon: Layers, roles: ['admin'] },
      { to: '/promotions', labelKey: 'nav.promotions', icon: TicketPercent, roles: ['admin', 'cashier', 'waiter'] },
      { to: '/inventory', labelKey: 'nav.supplies', icon: Package, roles: ['admin', 'chef'] },
    ],
  },
  {
    labelKey: 'shell.groups.team',
    items: [
      { to: '/tips', labelKey: 'nav.tips', icon: Award, roles: ['waiter'], strict: true },
      { to: '/users', labelKey: 'nav.users', icon: Users, roles: ['super-admin'] },
      { to: '/admin/staff-dashboard', labelKey: 'nav.staff_control', icon: ShieldCheck, roles: ['super-admin'] },
      { to: '/settings/finance', labelKey: 'nav.settings', icon: Settings, roles: ['super-admin'] },
    ],
  },
]

/** Accesos de la barra inferior en celular, por rol (al alcance del pulgar). */
export const MOBILE_TABS: Record<SystemRole, string[]> = {
  'super-admin': ['/', '/tables', '/cashier', '/kitchen'],
  admin: ['/', '/tables', '/cashier', '/kitchen'],
  cashier: ['/cashier', '/pickup', '/kitchen', '/admin/invoices'],
  waiter: ['/tables', '/pickup', '/promotions', '/tips'],
  chef: ['/kitchen', '/inventory'],
  guest: [],
}
