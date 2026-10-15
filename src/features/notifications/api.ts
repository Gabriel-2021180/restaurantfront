import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveInterval } from '@/app/providers/SocketProvider'
import api from '@/lib/api/client'
import type { AppNotification } from '@/types/notification'

export const notificationsKey = ['users', 'notifications'] as const

export function useNotifications(enabled: boolean) {
  const interval = useLiveInterval(60_000)
  return useQuery({
    queryKey: notificationsKey,
    queryFn: async () => (await api.get<AppNotification[]>('/users/notifications')).data,
    enabled,
    refetchInterval: interval,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/users/notifications/${id}/read`),
    onMutate: (id) =>
      qc.setQueryData<AppNotification[]>(notificationsKey, (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      ),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/users/notifications/read-all'),
    onMutate: () =>
      qc.setQueryData<AppNotification[]>(notificationsKey, (prev) => prev?.map((n) => ({ ...n, is_read: true }))),
  })
}
