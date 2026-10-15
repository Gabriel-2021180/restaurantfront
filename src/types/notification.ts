export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: NotificationType
  target_url: string | null
  is_read: boolean
  created_at: string
}
