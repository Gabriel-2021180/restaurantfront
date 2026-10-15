import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocketEvent } from '@/app/providers/SocketProvider'
import api from '@/lib/api/client'
import { toNumber } from '@/lib/format'
import { menuKeys } from '@/features/menu/api'
import type { Product } from '@/types/menu'

export interface Supply {
  id: string
  name: string
  /** 'GRAMO' (se muestra en kg) o 'UNIDAD'. */
  unit: string
  /** Costo por unidad base (por gramo si unit = GRAMO). */
  cost_per_unit: number
  current_stock: number
  min_stock_alert: number
}

export interface SupplyInput {
  name: string
  unit: string
  cost_per_unit: number
  current_stock: number
  min_stock_alert: number
}

export const supplyKeys = { all: ['inventory', 'supplies'] as const }

/** En pantalla se trabaja en kilos; la API guarda gramos. */
export const isWeight = (s: Pick<Supply, 'unit'>) => s.unit === 'GRAMO'
export const toDisplay = (s: Pick<Supply, 'unit'>, base: number) => (isWeight(s) ? base / 1000 : base)
export const toBase = (s: Pick<Supply, 'unit'>, display: number) => (isWeight(s) ? display * 1000 : display)
/** Precio por kg (o por unidad) para mostrar y editar. */
export const displayCost = (s: Supply) => (isWeight(s) ? s.cost_per_unit * 1000 : s.cost_per_unit)
export const baseCost = (unit: string, display: number) => Number((unit === 'GRAMO' ? display / 1000 : display).toFixed(6))

const normalize = (s: Supply): Supply => ({
  ...s,
  cost_per_unit: toNumber(s.cost_per_unit),
  current_stock: toNumber(s.current_stock),
  min_stock_alert: toNumber(s.min_stock_alert),
})

export function useSupplies() {
  return useQuery({
    queryKey: supplyKeys.all,
    queryFn: async () => (await api.get<Supply[]>('/inventory/supplies')).data.map(normalize).sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })
}

/** El stock baja solo cuando se venden platos: escuchamos el evento para no mostrar datos viejos. */
export function useInventoryLive() {
  const qc = useQueryClient()
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: supplyKeys.all })
    void qc.invalidateQueries({ queryKey: menuKeys.products })
  }, [qc])
  useSocketEvent('supply_stock_changed', refresh)
  useSocketEvent('product_status_changed', refresh)
}

export function useSupplyActions() {
  const qc = useQueryClient()
  const onSettled = () => void qc.invalidateQueries({ queryKey: supplyKeys.all })
  return {
    create: useMutation({ mutationFn: async (input: SupplyInput) => (await api.post<Supply>('/inventory/supplies', input)).data, onSettled }),
    update: useMutation({
      mutationFn: async ({ id, ...input }: Partial<SupplyInput> & { id: string }) => (await api.patch<Supply>(`/inventory/supplies/${id}`, input)).data,
      onSettled,
    }),
    remove: useMutation({ mutationFn: async (id: string) => (await api.delete(`/inventory/supplies/${id}`)).data, onSettled }),
    addStock: useMutation({
      mutationFn: async ({ id, quantity, new_cost }: { id: string; quantity: number; new_cost?: number }) =>
        (await api.post(`/inventory/supplies/${id}/stock`, new_cost == null ? { quantity } : { quantity, new_cost })).data,
      onSettled,
    }),
  }
}

/** Productos de reventa (gaseosas, cervezas...): su stock vive en el producto. */
export function useRestockProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ product, add, purchase_price }: { product: Product & { purchase_price?: number | null }; add: number; purchase_price?: number }) => {
      const form = new FormData()
      form.append('stock', String(Math.round(toNumber(product.stock) + add)))
      if (purchase_price != null) form.append('purchase_price', purchase_price.toFixed(2))
      return (await api.patch<Product>(`/menu/products/${product.id}`, form)).data
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: menuKeys.products }),
  })
}
