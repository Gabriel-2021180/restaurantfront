import axios, { type AxiosAdapter } from 'axios'
import type { User } from '@/types/auth'

/**
 * Sesión del navegador.
 * - El token de acceso (15 min) vive solo en memoria: ningún script puede leerlo de localStorage.
 * - La sesión larga es una cookie httpOnly que pone la API y que el navegador manda solo a /auth.
 * - Al abrir la app o cuando el token está por vencer, se pide uno nuevo a POST /auth/refresh.
 * - Las pestañas abiertas comparten el token nuevo por BroadcastChannel y se turnan para renovarlo
 *   (navigator.locks), así nunca presentan dos veces la misma cookie.
 */

const ACTIVITY_KEY = 'last-activity'
const REFRESH_LEAD_MS = 60_000

/** Sin uso por este tiempo, la sesión se cierra sola (decisión del dueño: un turno completo). */
export const IDLE_LIMIT_MS = 8 * 60 * 60_000

export interface SessionPayload {
  access_token: string
  user: User
  access_expires_in?: number
}

type Listener = (state: { token: string | null; user: User | null }) => void

let token: string | null = null
let expiresAt = 0
let user: User | null = null
let refreshTimer: number | undefined
let inflight: Promise<SessionPayload | null> | null = null
const listeners = new Set<Listener>()
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('resto-admin-session')

let apiBase = '/api/v1'
let adapter: AxiosAdapter | undefined
/** Cliente sin interceptores: el refresh no puede depender del propio refresh. */
const raw = () => axios.create({ baseURL: apiBase, withCredentials: true, ...(adapter ? { adapter } : {}) })

function emit() {
  for (const l of listeners) l({ token, user })
}

function schedule() {
  window.clearTimeout(refreshTimer)
  if (!token) return
  const wait = Math.max(5_000, expiresAt - Date.now() - REFRESH_LEAD_MS)
  refreshTimer = window.setTimeout(() => void session.refresh(), wait)
}

function apply(p: SessionPayload, broadcast: boolean) {
  token = p.access_token
  user = p.user
  expiresAt = Date.now() + (p.access_expires_in ?? 900) * 1000
  schedule()
  emit()
  if (broadcast) channel?.postMessage({ type: 'session', payload: p, expiresAt })
}

function wipe(broadcast: boolean) {
  window.clearTimeout(refreshTimer)
  token = null
  user = null
  expiresAt = 0
  try {
    localStorage.removeItem(ACTIVITY_KEY)
  } catch {
    /* sin almacenamiento */
  }
  emit()
  if (broadcast) channel?.postMessage({ type: 'logout' })
}

if (channel) {
  channel.onmessage = (e: MessageEvent<{ type: string; payload?: SessionPayload; expiresAt?: number }>) => {
    if (e.data.type === 'session' && e.data.payload) {
      apply(e.data.payload, false)
      if (e.data.expiresAt) {
        expiresAt = e.data.expiresAt
        schedule()
      }
    } else if (e.data.type === 'logout') wipe(false)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function doRefresh(): Promise<SessionPayload | null> {
  // Otra pestaña pudo renovar mientras esperábamos el turno: se usa ese token.
  if (token && expiresAt - Date.now() > REFRESH_LEAD_MS * 2) return { access_token: token, user: user! }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await raw().post<SessionPayload>('/auth/refresh')
      apply(data, true)
      return data
    } catch (err) {
      const code = axios.isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined
      if (code === 'REFRESH_RACE' && attempt === 0) {
        await sleep(300)
        continue
      }
      if (axios.isAxiosError(err) && !err.response) throw err // sin red: no se cierra la sesión
      wipe(true)
      return null
    }
  }
  return null
}

export const session = {
  configure(baseURL: string, customAdapter?: AxiosAdapter) {
    apiBase = baseURL
    adapter = customAdapter
  },
  getToken: () => token,
  getUser: () => user,
  subscribe(l: Listener) {
    listeners.add(l)
    return () => void listeners.delete(l)
  },
  /** Guarda la sesión recién iniciada (respuesta de /auth/login). */
  start(p: SessionPayload) {
    session.touch()
    apply(p, true)
  },
  setUser(next: User) {
    user = next
    emit()
  },
  /** Pide un token nuevo con la cookie. Una sola petición a la vez, en esta y en las demás pestañas. */
  refresh(): Promise<SessionPayload | null> {
    if (!inflight) {
      const run = () => doRefresh()
      const locked: Promise<SessionPayload | null> = navigator.locks ? navigator.locks.request('resto-admin-refresh', () => run()).then((r) => r) : run()
      inflight = locked.finally(() => {
        inflight = null
      })
    }
    return inflight!
  },
  /** Cierra la sesión en este dispositivo (la API revoca la cookie). */
  async logout() {
    try {
      await raw().post('/auth/logout')
    } catch {
      /* igual se limpia localmente */
    }
    wipe(true)
  },
  /** Limpia sin llamar a la API (sesión ya revocada). */
  clear: () => wipe(true),
  idle(now = Date.now()): boolean {
    try {
      const last = Number(localStorage.getItem(ACTIVITY_KEY) ?? now)
      return now - last > IDLE_LIMIT_MS
    } catch {
      return false
    }
  },
  touch(now = Date.now()) {
    try {
      localStorage.setItem(ACTIVITY_KEY, String(now))
    } catch {
      /* almacenamiento bloqueado: sin registro de actividad */
    }
  },
}

// Restos del esquema anterior (token en localStorage): se borran al cargar.
try {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
} catch {
  /* sin almacenamiento */
}
