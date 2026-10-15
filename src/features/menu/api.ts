import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api/client'
import type { Category, Product } from '@/types/menu'

export const menuKeys = {
  products: ['menu', 'products'] as const,
  categories: ['menu', 'categories'] as const,
}

export function useProductsQuery() {
  return useQuery({
    queryKey: menuKeys.products,
    queryFn: async () => (await api.get<Product[]>('/menu/products')).data,
  })
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: menuKeys.categories,
    queryFn: async () => (await api.get<Category[]>('/menu/categories')).data,
  })
}
