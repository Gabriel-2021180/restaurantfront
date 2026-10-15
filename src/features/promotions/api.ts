import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api/client'
import type { ActivePromotion, PricingType, Promotion, PromotionKind } from '@/types/menu'

export const promoKeys = {
  all: ['marketing', 'promotions'] as const,
  trash: ['marketing', 'promotions', 'trash'] as const,
  active: ['marketing', 'promotions', 'active'] as const,
}

export interface PromotionInput {
  name: string
  description: string | null
  kind: PromotionKind
  pricing_type: PricingType
  value: number | null
  items?: { product_id: string; quantity: number }[]
  targets?: { product_id?: string; category_id?: string }[]
  start_date: string | null
  end_date: string | null
  days_of_week: number[] | null
  start_time: string | null
  end_time: string | null
  code: string | null
  max_uses: number | null
  is_active: boolean
}

export function usePromotions(enabled = true) {
  return useQuery({ queryKey: promoKeys.all, queryFn: async () => (await api.get<Promotion[]>('/marketing/promotions')).data, enabled })
}

export function usePromotionsTrash(enabled: boolean) {
  return useQuery({ queryKey: promoKeys.trash, queryFn: async () => (await api.get<Promotion[]>('/marketing/promotions/trash')).data, enabled })
}

export function useActivePromotions() {
  return useQuery({
    queryKey: promoKeys.active,
    queryFn: async () => (await api.get<ActivePromotion[]>('/marketing/promotions/active')).data,
    refetchInterval: 5 * 60_000,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: promoKeys.all })
}

/** En la creación se omiten los vacíos; en la edición se envían como null para borrarlos. */
const clean = (input: PromotionInput, forCreate: boolean) =>
  forCreate ? Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null && v !== '')) : input

export function useSavePromotion() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PromotionInput }) => {
      if (id) {
        const { kind: _kind, ...rest } = clean(input, false) as PromotionInput
        return (await api.patch<Promotion>(`/marketing/promotions/${id}`, rest)).data
      }
      return (await api.post<Promotion>('/marketing/promotions', clean(input, true))).data
    },
    onSuccess: invalidate,
  })
}

export function useTogglePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      (await api.patch<Promotion>(`/marketing/promotions/${id}`, { is_active })).data,
    onMutate: ({ id, is_active }) =>
      qc.setQueryData<Promotion[]>(promoKeys.all, (prev) => prev?.map((p) => (p.id === id ? { ...p, is_active } : p))),
    onSettled: () => qc.invalidateQueries({ queryKey: promoKeys.all }),
  })
}

export function useDeletePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/marketing/promotions/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'promotions'] }),
  })
}

export function useRestorePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/marketing/promotions/${id}/restore`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing', 'promotions'] }),
  })
}
