import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocketEvent } from '@/app/providers/SocketProvider'
import { vibrate } from '@/lib/feedback'

/**
 * Pedido listo para quien atiende la orden. El aviso visible (sonido + toast + campana) es la
 * notificación "Pedido listo" que guarda la API (ver NotificationAlerts); este evento solo
 * vibra el celular y refresca mesas y el pedido, para no anunciar dos veces.
 */
export function WaiterReadyAlerts() {
  const qc = useQueryClient()
  const onReady = useCallback(
    ({ orderId }: { orderId: string }) => {
      vibrate()
      void qc.invalidateQueries({ queryKey: ['orders', orderId] })
      void qc.invalidateQueries({ queryKey: ['orders', 'active'] })
      void qc.invalidateQueries({ queryKey: ['tables'] })
    },
    [qc],
  )
  useSocketEvent<{ orderId: string }>('order_ready_for_waiter', onReady)
  return null
}
