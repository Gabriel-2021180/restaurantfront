import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiveInterval, useSocketEvent } from '@/app/providers/SocketProvider'
import api from '@/lib/api/client'
import type { Order } from '@/types/order'

export type TableStatus = 'available' | 'occupied' | 'reserved'

export interface NextReservation {
  id: string
  customer_name: string
  party_size: number
  reserved_at: string
}

export interface DiningTable {
  id: string
  table_number: string
  capacity: number
  status: TableStatus
  current_order_id: string | null
  next_reservation?: NextReservation | null
  deletedAt?: string | null
}

export const tableKeys = {
  all: ['tables'] as const,
  trash: ['tables', 'trash'] as const,
  activeOrders: ['orders', 'active'] as const,
}

/** La API manda el número como texto; ordenamos "2" antes que "10" y luego alfabético. */
const byNumber = (a: DiningTable, b: DiningTable) =>
  String(a.table_number).localeCompare(String(b.table_number), 'es', { numeric: true, sensitivity: 'base' })

export function useTablesQuery() {
  const interval = useLiveInterval()
  return useQuery({
    queryKey: tableKeys.all,
    queryFn: async () => (await api.get<DiningTable[]>('/tables')).data.slice().sort(byNumber),
    refetchInterval: interval,
  })
}

export function useTablesTrash(enabled: boolean) {
  return useQuery({
    queryKey: tableKeys.trash,
    queryFn: async () => (await api.get<DiningTable[]>('/tables/trashed')).data.slice().sort(byNumber),
    enabled,
  })
}

/** Pedidos abiertos: con ellos armamos la vista previa de cada mesa ocupada. */
export function useActiveOrders() {
  const interval = useLiveInterval()
  return useQuery({
    queryKey: tableKeys.activeOrders,
    queryFn: async () => (await api.get<Order[]>('/orders', { params: { active: true } })).data,
    refetchInterval: interval,
  })
}

/** Mantiene mesas y pedidos al día con los eventos en vivo. */
export function useTablesLive() {
  const qc = useQueryClient()
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: tableKeys.all })
    void qc.invalidateQueries({ queryKey: tableKeys.activeOrders })
  }, [qc])
  useSocketEvent('table_status_changed', refresh)
  useSocketEvent('reservation_updated', refresh)
  useSocketEvent('kitchen_batch_ready', refresh)
  // Al mesero la API no le manda kitchen_batch_ready (es de cocina/caja): le llega este aviso privado.
  useSocketEvent('order_ready_for_waiter', refresh)
  useSocketEvent('kitchen_new_order', refresh)
  useSocketEvent('order_moved', refresh)
}

export function useOpenTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { table_id: string; reservation_id?: string }) => (await api.post<Order>('/orders', input)).data,
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: tableKeys.all })
      void qc.invalidateQueries({ queryKey: tableKeys.activeOrders })
    },
  })
}

export interface TableInput {
  table_number: string
  capacity: number
}

export function useTableAdmin() {
  const qc = useQueryClient()
  const onSettled = () => void qc.invalidateQueries({ queryKey: tableKeys.all })
  return {
    create: useMutation({ mutationFn: async (input: TableInput) => (await api.post<DiningTable>('/tables', input)).data, onSettled }),
    update: useMutation({
      mutationFn: async ({ id, ...input }: TableInput & { id: string }) => (await api.patch<DiningTable>(`/tables/${id}`, input)).data,
      onSettled,
    }),
    remove: useMutation({ mutationFn: async (id: string) => (await api.delete(`/tables/${id}`)).data, onSettled }),
    restore: useMutation({ mutationFn: async (id: string) => (await api.post(`/tables/${id}/restore`)).data, onSettled }),
  }
}
