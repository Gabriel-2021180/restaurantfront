import { useCallback } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocketEvent } from '@/app/providers/SocketProvider'
import api from '@/lib/api/client'
import type { Order } from '@/types/order'
import type { Reservation, ReservationInput, ReservationStatus } from '@/types/reservation'
import { tableKeys } from '@/features/tables/api'

export const reservationKeys = {
  all: ['reservations'] as const,
  range: (from: string, to: string) => ['reservations', from, to] as const,
}

export function useReservations(from: string, to: string) {
  return useQuery({
    queryKey: reservationKeys.range(from, to),
    queryFn: async () => (await api.get<Reservation[]>('/reservations', { params: { from, to } })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

/** Cualquier cambio de reservas (de otro dispositivo o del cron) refresca la lista y las mesas. */
export function useReservationsLive() {
  const qc = useQueryClient()
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: reservationKeys.all })
    void qc.invalidateQueries({ queryKey: tableKeys.all })
  }, [qc])
  useSocketEvent('reservation_updated', refresh)
}

export function useReservationActions() {
  const qc = useQueryClient()
  const onSettled = () => {
    void qc.invalidateQueries({ queryKey: reservationKeys.all })
    void qc.invalidateQueries({ queryKey: tableKeys.all })
  }
  return {
    create: useMutation({ mutationFn: async (input: ReservationInput) => (await api.post<Reservation>('/reservations', input)).data, onSettled }),
    update: useMutation({
      mutationFn: async ({ id, ...input }: Partial<ReservationInput> & { id: string }) => (await api.patch<Reservation>(`/reservations/${id}`, input)).data,
      onSettled,
    }),
    setStatus: useMutation({
      mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => (await api.patch<Reservation>(`/reservations/${id}/status`, { status })).data,
      onSettled,
    }),
    cancel: useMutation({ mutationFn: async (id: string) => (await api.delete<Reservation>(`/reservations/${id}`)).data, onSettled }),
    seat: useMutation({
      mutationFn: async ({ table_id, reservation_id }: { table_id: string; reservation_id: string }) =>
        (await api.post<Order>('/orders', { table_id, reservation_id })).data,
      onSettled: () => {
        onSettled()
        void qc.invalidateQueries({ queryKey: tableKeys.activeOrders })
      },
    }),
  }
}
