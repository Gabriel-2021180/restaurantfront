import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { useSocketEvent } from '@/app/providers/SocketProvider'
import { playChime } from '@/lib/feedback'
import { safeInternalPath } from '@/lib/utils'
import type { AppNotification } from '@/types/notification'
import { notificationsKey, useMarkNotificationRead, useNotifications } from './api'

/**
 * Anuncia avisos nuevos (sonido + toast) una sola vez, se monte donde se monte la campana.
 * Llegan por socket al instante; si el socket no conecta, la consulta periódica los descubre igual.
 */
export function NotificationAlerts() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isAuthenticated } = useAuth()
  const { data } = useNotifications(isAuthenticated)
  const markRead = useMarkNotificationRead()
  const seen = useRef<Set<string> | null>(null)

  const announce = useCallback(
    (n: AppNotification) => {
      seen.current?.add(n.id)
      playChime()
      const to = safeInternalPath(n.target_url)
      const show = n.type === 'error' ? toast.error : n.type === 'warning' ? toast.warning : n.type === 'success' ? toast.success : toast.info
      show(n.title, {
        id: `notif-${n.id}`,
        description: n.message,
        action: to
          ? {
              label: 'Ver',
              onClick: () => {
                if (!n.is_read) markRead.mutate(n.id)
                navigate(to)
              },
            }
          : undefined,
      })
    },
    [markRead, navigate],
  )

  const onLive = useCallback(
    (n: AppNotification) => {
      qc.setQueryData<AppNotification[]>(notificationsKey, (prev = []) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 50))
      if (!seen.current?.has(n.id)) announce(n)
    },
    [qc, announce],
  )
  useSocketEvent<AppNotification>('notification', onLive)

  // Respaldo sin socket: lo que aparece no leído y no se había visto, se anuncia.
  useEffect(() => {
    if (!data) return
    if (!seen.current) {
      seen.current = new Set(data.map((n) => n.id))
      return
    }
    for (const n of data) if (!n.is_read && !seen.current.has(n.id)) announce(n)
    for (const n of data) seen.current.add(n.id)
  }, [data, announce])

  return null
}
