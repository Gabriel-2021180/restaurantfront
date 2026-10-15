import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import api, { AUTH_NOTICE_KEY } from '@/lib/api/client'
import { session, type SessionPayload } from '@/lib/session'
import { getSystemRole, hasRole as userHasRole } from '@/lib/roles'
import type { SystemRole, User } from '@/types/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  role: SystemRole
  isAuthenticated: boolean
  /** true mientras se intenta recuperar la sesión con la cookie al abrir la app. */
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  hasRole: (allowed: SystemRole | SystemRole[]) => boolean
  refreshUser: () => Promise<User | undefined>
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const IDLE_NOTICE = 'Cerramos tu sesión por inactividad. Vuelve a ingresar.'

function notice(text: string) {
  try {
    sessionStorage.setItem(AUTH_NOTICE_KEY, text)
  } catch {
    /* sin aviso */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(session.getToken())
  const [user, setUser] = useState<User | null>(session.getUser())
  const [loading, setLoading] = useState(!session.getToken())

  // La sesión vive en lib/session (memoria + cookie); aquí solo se refleja.
  useEffect(
    () =>
      session.subscribe((s) => {
        setToken(s.token)
        setUser(s.user)
      }),
    [],
  )

  // Al abrir la app: si pasó demasiado tiempo sin uso no se reabre; si no, se recupera con la cookie.
  useEffect(() => {
    if (session.getToken()) return
    let alive = true
    const restore = session.idle() ? session.logout().then(() => null) : session.refresh().catch(() => null)
    void restore.finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<SessionPayload>('/auth/login', { email, password })
    session.start(data)
    return data.user
  }, [])

  const logout = useCallback(() => {
    void session.logout().finally(() => window.location.assign('/login'))
  }, [])

  // Mientras haya sesión: registra actividad y la cierra tras 8 h sin uso.
  useEffect(() => {
    if (!token) return
    let last = 0
    const check = () => {
      if (!session.idle()) return
      notice(IDLE_NOTICE)
      logout()
    }
    const onActivity = () => {
      const now = Date.now()
      if (now - last < 60_000) return
      // Al volver tras horas sin uso, primero se verifica: tocar la pantalla no revive la sesión.
      if (session.idle(now)) return check()
      last = now
      session.touch(now)
    }
    const events = ['pointerdown', 'keydown', 'visibilitychange'] as const
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))
    const id = window.setInterval(check, 60_000)
    check()
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity))
      window.clearInterval(id)
    }
  }, [token, logout])

  const refreshUser = useCallback(async () => {
    if (!session.getToken()) return undefined
    try {
      const { data } = await api.get<User>('/auth/profile', { params: { _t: Date.now() } })
      session.setUser(data)
      return data
    } catch {
      return undefined
    }
  }, [])

  const updateUser = useCallback((patch: Partial<User>) => {
    const prev = session.getUser()
    if (prev) session.setUser({ ...prev, ...patch })
  }, [])

  const hasRole = useCallback((allowed: SystemRole | SystemRole[]) => userHasRole(user, allowed), [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      role: getSystemRole(user),
      isAuthenticated: Boolean(user && token),
      loading,
      login,
      logout,
      hasRole,
      refreshUser,
      updateUser,
    }),
    [user, token, loading, login, logout, hasRole, refreshUser, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
