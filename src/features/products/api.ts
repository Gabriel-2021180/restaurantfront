import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api/client'
import { toNumber } from '@/lib/format'
import { menuKeys } from '@/features/menu/api'
import type { Category, Product } from '@/types/menu'

/** Producto con los datos internos que solo ve el admin (costos y receta). */
export interface ProductDetail extends Product {
  total_cost?: number | null
  fixed_cost?: number | null
  purchase_price?: number | null
  recipeIngredients?: { supply_id: string; quantity: number; supply?: { id: string; name: string; unit: string; cost_per_unit: number } | null }[]
}

export interface ProductInput {
  name: string
  price: number
  description: string
  category_id: string
  track_stock: boolean
  stock?: number
  purchase_price?: number
  fixed_cost?: number
  ingredients?: { supply_id: string; quantity: number }[]
  image?: File | null
}

export const productKeys = {
  trash: ['menu', 'products', 'trash'] as const,
  detail: (id: string) => ['menu', 'products', id] as const,
  categoriesTrash: ['menu', 'categories', 'trash'] as const,
}

export function useProductDetail(id: string | null) {
  return useQuery({
    queryKey: productKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<ProductDetail>(`/menu/products/${id}`)).data,
    enabled: Boolean(id),
  })
}

export function useProductsTrash(enabled: boolean) {
  return useQuery({ queryKey: productKeys.trash, queryFn: async () => (await api.get<ProductDetail[]>('/menu/products/deleted')).data, enabled })
}

/** La API recibe multipart (imagen en `file`); números y booleanos van como texto y arrays como JSON. */
function toForm(input: ProductInput) {
  const f = new FormData()
  f.append('name', input.name.trim())
  f.append('price', input.price.toFixed(2))
  f.append('description', input.description.trim())
  f.append('category_id', input.category_id)
  f.append('track_stock', String(input.track_stock))
  if (input.track_stock) {
    f.append('stock', String(Math.round(toNumber(input.stock))))
    f.append('purchase_price', toNumber(input.purchase_price).toFixed(2))
  } else {
    f.append('fixed_cost', toNumber(input.fixed_cost).toFixed(2))
    f.append('ingredients', JSON.stringify(input.ingredients ?? []))
  }
  if (input.image) f.append('file', input.image)
  return f
}

export function useProductActions() {
  const qc = useQueryClient()
  const onSettled = () => {
    void qc.invalidateQueries({ queryKey: menuKeys.products })
  }
  return {
    create: useMutation({ mutationFn: async (input: ProductInput) => (await api.post<Product>('/menu/products', toForm(input))).data, onSettled }),
    update: useMutation({
      mutationFn: async ({ id, ...input }: ProductInput & { id: string }) => (await api.patch<Product>(`/menu/products/${id}`, toForm(input))).data,
      onSettled,
    }),
    toggle: useMutation({
      mutationFn: async (id: string) => (await api.patch<Product>(`/menu/products/${id}/toggle`)).data,
      onMutate: async (id) => {
        await qc.cancelQueries({ queryKey: menuKeys.products })
        const prev = qc.getQueryData<Product[]>(menuKeys.products)
        qc.setQueryData<Product[]>(menuKeys.products, (list) => list?.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)))
        return { prev }
      },
      onError: (_e, _id, ctx) => ctx?.prev && qc.setQueryData(menuKeys.products, ctx.prev),
      onSettled,
    }),
    remove: useMutation({ mutationFn: async (id: string) => (await api.delete(`/menu/products/${id}`)).data, onSettled }),
    restore: useMutation({
      mutationFn: async (id: string) => (await api.patch(`/menu/products/${id}/restore`)).data,
      onSettled: () => {
        onSettled()
        void qc.invalidateQueries({ queryKey: productKeys.trash })
      },
    }),
  }
}

export function useCategoriesTrash(enabled: boolean) {
  return useQuery({ queryKey: productKeys.categoriesTrash, queryFn: async () => (await api.get<Category[]>('/menu/categories/deleted')).data, enabled })
}

export function useCategoryActions() {
  const qc = useQueryClient()
  const onSettled = () => {
    void qc.invalidateQueries({ queryKey: menuKeys.categories })
    void qc.invalidateQueries({ queryKey: productKeys.categoriesTrash })
  }
  return {
    create: useMutation({ mutationFn: async (input: { name: string; description?: string }) => (await api.post<Category>('/menu/categories', input)).data, onSettled }),
    update: useMutation({
      mutationFn: async ({ id, ...input }: { id: string; name: string; description?: string }) => (await api.patch<Category>(`/menu/categories/${id}`, input)).data,
      onSettled,
    }),
    remove: useMutation({ mutationFn: async (id: string) => (await api.delete(`/menu/categories/${id}`)).data, onSettled }),
    restore: useMutation({ mutationFn: async (id: string) => (await api.patch(`/menu/categories/${id}/restore`)).data, onSettled }),
  }
}
