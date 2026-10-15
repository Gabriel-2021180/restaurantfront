import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { PageFallback } from '@/components/layout/PageFallback'
import { ROLE_HOME, hasRole } from '@/lib/roles'
import type { SystemRole } from '@/types/auth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  // Se espera a recuperar la sesión con la cookie antes de decidir.
  if (loading) return <PageFallback />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function RequireRole({ roles, strict, children }: { roles: SystemRole[]; strict?: boolean; children: ReactNode }) {
  const { user, role } = useAuth()
  if (!hasRole(user, roles, strict)) return <Navigate to={ROLE_HOME[role]} replace />
  return children
}

/** "/" es el panel del admin; el resto de roles entra directo a su trabajo. */
export function RoleHome({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  if (role === 'admin' || role === 'super-admin') return children
  return <Navigate to={ROLE_HOME[role]} replace />
}

/** Login/registro: si ya hay sesión, entra a su inicio. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to={ROLE_HOME[role]} replace />
  return children
}
