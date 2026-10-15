import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveInterval } from '@/app/providers/SocketProvider'
import api from '@/lib/api/client'
import type { Order } from '@/types/order'

export const orderKeys = {
  detail: (id: string) => ['orders', id] as const,
  history: (id: string) => ['orders', id, 'kitchen-history'] as const,
}

export function useOrder(id: string | undefined) {
  const interval = useLiveInterval()
  return useQuery({
    queryKey: orderKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<Order>(`/orders/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: interval,
  })
}

export type AddItemInput =
  | { product_id: string; quantity: number; notes?: string | null }
  | { promotion_id: string; quantity: number; notes?: string | null }
  | { code: string; quantity: number; notes?: string | null }

/** Todas las acciones de la comanda; cada una vuelve a leer el pedido al terminar. */
export function useOrderActions(orderId: string) {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: orderKeys.detail(orderId) })
    void qc.invalidateQueries({ queryKey: ['menu', 'products'] })
    // Mesas, cocina y caja muestran este pedido: quedan viejas si no se marcan aquí.
    void qc.invalidateQueries({ queryKey: ['tables'] })
    void qc.invalidateQueries({ queryKey: ['orders', 'active'] })
  }

  const addItem = useMutation({
    mutationFn: async (input: AddItemInput) => (await api.post<{ message: string; total: number; warning?: string }>(`/orders/${orderId}/items`, input)).data,
    onSettled: refresh,
  })

  const removeItem = useMutation({
    mutationFn: async (detailId: string) => (await api.delete(`/orders/items/${detailId}`)).data,
    onMutate: async (detailId) => {
      await qc.cancelQueries({ queryKey: orderKeys.detail(orderId) })
      const prev = qc.getQueryData<Order>(orderKeys.detail(orderId))
      qc.setQueryData<Order>(orderKeys.detail(orderId), (o) =>
        o ? { ...o, details: o.details.filter((d) => d.id !== detailId && d.parent_detail_id !== detailId) } : o,
      )
      return { prev }
    },
    onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(orderKeys.detail(orderId), ctx.prev),
    onSettled: refresh,
  })

  const sendToKitchen = useMutation({
    mutationFn: async () => (await api.post<{ batch_number?: number }>(`/orders/${orderId}/kitchen`, {})).data,
    onSettled: refresh,
  })

  const requestBill = useMutation({
    mutationFn: async () => (await api.patch(`/orders/${orderId}/close`)).data,
    onSettled: () => {
      refresh()
      // Incluye la cola de cobro de Caja (['orders', 'pending_payment']).
      void qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const applyCode = useMutation({
    mutationFn: async (code: string) => (await api.post(`/orders/${orderId}/promotions`, { code })).data,
    onSettled: refresh,
  })

  const removePromotion = useMutation({
    mutationFn: async (promotionId: string) => (await api.delete(`/orders/${orderId}/promotions/${promotionId}`)).data,
    onSettled: refresh,
  })

  return { addItem, removeItem, sendToKitchen, requestBill, applyCode, removePromotion }
}
