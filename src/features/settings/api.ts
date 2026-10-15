import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api/client'
import { BRANDING_KEY } from '@/app/providers/BrandingProvider'
import type { Branding } from '@/types/branding'

export interface FinanceConfig {
  name: string
  nit: string
  address: string
  phone: string
  legend_law: string
  enable_auto_close: boolean
  auto_close_time: string
  block_sale_on_low_supply: boolean
}

export const FINANCE_CONFIG_KEY = ['finance', 'config'] as const

const EMPTY_CONFIG: FinanceConfig = {
  name: '',
  nit: '',
  address: '',
  phone: '',
  legend_law: '',
  enable_auto_close: false,
  auto_close_time: '00:00',
  block_sale_on_low_supply: false,
}

/** Normaliza la respuesta: la API puede devolver null en campos vacíos o la hora con segundos. */
function toConfig(data: Partial<Record<keyof FinanceConfig, unknown>> | null | undefined): FinanceConfig {
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    name: str(data?.name),
    nit: str(data?.nit),
    address: str(data?.address),
    phone: str(data?.phone),
    legend_law: str(data?.legend_law),
    enable_auto_close: Boolean(data?.enable_auto_close),
    auto_close_time: str(data?.auto_close_time).slice(0, 5) || EMPTY_CONFIG.auto_close_time,
    block_sale_on_low_supply: Boolean(data?.block_sale_on_low_supply),
  }
}

export function useFinanceConfig() {
  return useQuery({
    queryKey: FINANCE_CONFIG_KEY,
    queryFn: async () => toConfig((await api.get('/finance/config')).data),
  })
}

export function useUpdateFinanceConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: FinanceConfig) => toConfig((await api.put('/finance/config', input)).data),
    onSuccess: (data) => qc.setQueryData(FINANCE_CONFIG_KEY, data),
  })
}

/** Lectura directa (sin el fallback silencioso del provider) para saber si la API respondió. */
export function useBrandingSettings() {
  return useQuery({
    queryKey: BRANDING_KEY,
    queryFn: async () => (await api.get<Branding>('/settings/branding')).data,
  })
}

export interface BrandingInput {
  name: string
  accent_color: string
  logo?: File | null
  favicon?: File | null
  remove_logo?: boolean
  remove_favicon?: boolean
}

export function useUpdateBranding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: BrandingInput) => {
      const form = new FormData()
      form.append('name', input.name.trim())
      form.append('accent_color', input.accent_color)
      if (input.logo) form.append('logo', input.logo)
      if (input.favicon) form.append('favicon', input.favicon)
      if (input.remove_logo) form.append('remove_logo', 'true')
      if (input.remove_favicon) form.append('remove_favicon', 'true')
      return (await api.put<Branding>('/settings/branding', form)).data
    },
    onSuccess: (data) => qc.setQueryData(BRANDING_KEY, data),
  })
}
