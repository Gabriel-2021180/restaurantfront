import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { API_URL, AUTH_NOTICE_KEY } from '@/lib/api/client'
import { session } from '@/lib/session'
import { IS_DEMO } from '@/lib/demo/flag'
import { useAuth } from './AuthProvider'

interface SocketContextValue {
  socket: Socket | null
  connected: boolean
}

export const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false })

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth()
  const qc = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const userId = user?.id

  useEffect(() => {
    if (IS_DEMO || !isAuthenticated || !userId) return
    // La identidad sale solo del JWT. El token se lee en cada (re)conexión: dura 15 min y se renueva solo.
    const s = io(new URL(API_URL, window.location.origin).origin, {
      auth: (cb) => cb({ token: session.getToken() }),
      transports: ['websocket'],
    })
    // Se publica al conectar: antes de eso no puede llegar ningún evento.
    s.on('connect', () => {
      setSocket(s)
      setConnected(true)
    })
    // Tras un corte (celular bloqueado, wifi) se pierden eventos: se recarga lo visible.
    s.io.on('reconnect', () => void qc.invalidateQueries())
    // La API corta el socket si la sesión fue revocada (cerrar en todos, cambio de rol o correo).
    // Si el servidor corta, socket.io no reintenta solo: se reintenta para saber si fue por sesión revocada.
    s.on('disconnect', (reason) => {
      setConnected(false)
      if (reason === 'io server disconnect') s.connect()
    })
    s.on('connect_error', async (err) => {
      if (err.message !== 'UNAUTHORIZED') return
      // Primero se intenta renovar: puede ser solo el token de acceso vencido.
      if (await session.refresh().catch(() => null)) return void s.connect()
      try {
        sessionStorage.setItem(AUTH_NOTICE_KEY, 'Tu sesión se cerró. Vuelve a ingresar.')
      } catch {
        /* sin aviso */
      }
      logout()
    })
    return () => {
      s.close()
      setSocket(null)
      setConnected(false)
    }
  }, [isAuthenticated, userId, qc, logout])

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>
}

export function useSocket() {
  return useContext(SocketContext)
}

/**
 * Cada cuánto releer una pantalla operativa. Con el socket conectado los eventos la mantienen al día
 * y basta un respaldo lento; sin socket (red caída, o un servidor que no los soporta) se consulta seguido.
 */
export function useLiveInterval(withSocket = 30_000): number {
  const { connected } = useSocket()
  return connected ? withSocket : 8_000
}

/** Suscribe un handler a un evento del socket mientras el componente esté montado. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void) {
  const { socket } = useSocket()
  useEffect(() => {
    if (!socket) return
    socket.on(event, handler)
    return () => {
      socket.off(event, handler)
    }
  }, [socket, event, handler])
}
