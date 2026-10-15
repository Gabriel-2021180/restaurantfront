import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiErrorBody } from '@/types/api'
import { session } from '@/lib/session'

/**
 * Misma origen que la app: en desarrollo Vite reenvía /api a la API y en producción lo hace Vercel.
 * Así la cookie de sesión (httpOnly, SameSite=Strict) viaja sin exponerse a otros sitios.
 */
export const API_URL: string = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({ baseURL: API_URL, withCredentials: true })
session.configure(API_URL)

/**
 * Defensa en el navegador (la API valida igual): ningún texto que mandamos puede llevar
 * etiquetas HTML ni enlaces javascript:. Contraseñas y códigos quedan fuera: aceptan cualquier símbolo.
 */
const UNSAFE_TEXT = /<\s*\/?\s*[a-z!?][^>]*>|javascript\s*:|data\s*:\s*text\/html/i
const FREE_KEYS = /pass|token|code|secret/i

export class UnsafeInputError extends Error {
  constructor() {
    super('El texto no puede contener etiquetas HTML ni código. Revisa lo que escribiste.')
    this.name = 'UnsafeInputError'
  }
}

function hasUnsafeText(value: unknown, key = ''): boolean {
  if (typeof value === 'string') return !FREE_KEYS.test(key) && UNSAFE_TEXT.test(value)
  if (Array.isArray(value)) return value.some((v) => hasUnsafeText(v, key))
  if (value && typeof value === 'object' && !(value instanceof Blob)) return Object.entries(value).some(([k, v]) => hasUnsafeText(v, k))
  return false
}

api.interceptors.request.use((config) => {
  const token = session.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const body = config.data instanceof FormData ? Object.fromEntries(config.data.entries()) : config.data
  if (hasUnsafeText(body) || hasUnsafeText(config.params)) throw new UnsafeInputError()
  return config
})

export const AUTH_NOTICE_KEY = 'auth-notice'

/** Rutas cuyo 401 lo maneja la propia pantalla (no expulsan la sesión). */
const AUTH_FLOW_PATHS = ['/invites/validate', '/auth/login', '/auth/refresh', '/auth/logout', '/register', '/forgot-password']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

function sendToLogin(notice?: string) {
  session.clear()
  try {
    if (notice) sessionStorage.setItem(AUTH_NOTICE_KEY, notice)
  } catch {
    /* sin aviso */
  }
  if (!window.location.pathname.startsWith('/login')) window.location.assign('/login')
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined
    const url = config?.url ?? ''
    if (error.response?.status === 401 && config && !AUTH_FLOW_PATHS.some((p) => url.includes(p))) {
      // Token de acceso vencido: se renueva con la cookie y se reintenta una sola vez.
      if (!config._retried) {
        config._retried = true
        const renewed = await session.refresh().catch(() => null)
        if (renewed) {
          config.headers.Authorization = `Bearer ${renewed.access_token}`
          return api(config)
        }
      }
      sendToLogin('Tu sesión venció. Vuelve a ingresar.')
    }
    return Promise.reject(error)
  },
)

/** Mensaje legible de cualquier error de la API (string o lista de ValidationPipe). */
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const msg = error.response?.data?.message
    // Un 403 con código propio (SELF_ADMIN_FORBIDDEN, TARGET_SUPER_ADMIN...) ya trae su mensaje.
    if (error.response?.data?.error === 'MISSING_PERMISSION' || (error.response?.status === 403 && (!msg || !error.response?.data?.error)))
      return 'Tu usuario no tiene permiso para hacer esto. Pídeselo al administrador.'
    if (Array.isArray(msg)) return msg.join(' ')
    if (msg) return msg
    if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

/** Código de máquina del error (ACCOUNT_LOCKED, CASH_REGISTER_CLOSED, ...), si la API lo envía. */
export function getErrorCode(error: unknown): string | undefined {
  return axios.isAxiosError<ApiErrorBody>(error) ? error.response?.data?.error : undefined
}

export default api
