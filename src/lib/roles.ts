import type { SystemRole, User } from '@/types/auth'

/** El backend envía roles en español o inglés; los normalizamos al slug del sistema. */
const ROLE_ALIASES: Record<string, SystemRole> = {
  cajero: 'cashier',
  cashier: 'cashier',
  mesero: 'waiter',
  waiter: 'waiter',
  garzon: 'waiter',
  admin: 'admin',
  administrador: 'admin',
  chef: 'chef',
  cocinero: 'chef',
}

export function getSystemRole(user: User | null | undefined): SystemRole {
  if (!user?.role) return 'guest'
  const raw = typeof user.role === 'string' ? user.role : (user.role.slug ?? user.role.name ?? '')
  const clean = raw.toLowerCase().trim()
  if (clean.includes('super')) return 'super-admin'
  return ROLE_ALIASES[clean] ?? 'guest'
}

/**
 * El super-admin pasa siempre, salvo en accesos `strict` (p. ej. propinas:
 * solo el propio mesero las ve, nadie más).
 */
export function hasRole(user: User | null | undefined, allowed: SystemRole | SystemRole[], strict = false): boolean {
  const role = getSystemRole(user)
  if (role === 'super-admin' && !strict) return true
  return Array.isArray(allowed) ? allowed.includes(role) : role === allowed
}

export function getDisplayName(user: User | null | undefined): string {
  if (!user) return ''
  const full = [user.first_names, user.last_names].filter(Boolean).join(' ')
  return full || user.name || user.email
}

/** Pantalla de inicio de cada rol: entra directo a su trabajo. */
export const ROLE_HOME: Record<SystemRole, string> = {
  'super-admin': '/',
  admin: '/',
  cashier: '/cashier',
  waiter: '/tables',
  chef: '/kitchen',
  guest: '/profile',
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
