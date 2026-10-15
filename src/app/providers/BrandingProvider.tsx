import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api/client'
import { buildBrandPalette } from '@/lib/color'
import type { Branding } from '@/types/branding'
import { useSocketEvent } from './SocketProvider'

export const DEFAULT_BRAND_NAME = 'Resto Admin'
export const DEFAULT_LOGO = '/brand/logo-default.svg'

export interface ResolvedBranding {
  name: string
  logoUrl: string
  faviconUrl: string
  accentColor: string | null
  isDefault: boolean
}

export const BRANDING_KEY = ['settings', 'branding'] as const

const resolve = (b?: Branding | null): ResolvedBranding => ({
  name: b?.name?.trim() || DEFAULT_BRAND_NAME,
  logoUrl: b?.logo_url || DEFAULT_LOGO,
  faviconUrl: b?.favicon_url || b?.logo_url || DEFAULT_LOGO,
  accentColor: b?.accent_color ?? null,
  isDefault: !b?.logo_url,
})

const BrandingContext = createContext<ResolvedBranding>(resolve(null))

async function fetchBranding(): Promise<Branding | null> {
  try {
    const { data } = await api.get<Branding>('/settings/branding')
    return data
  } catch {
    // Endpoint público aún no disponible o sin conexión: usamos la marca por defecto.
    return null
  }
}

function applyToDocument(b: ResolvedBranding) {
  const root = document.documentElement
  const palette = buildBrandPalette(b.accentColor)
  const vars = {
    '--brand': palette?.brand,
    '--brand-foreground': palette?.brandForeground,
    '--brand-dark': palette?.brandDark,
    '--brand-dark-foreground': palette?.brandDarkForeground,
  }
  for (const [k, v] of Object.entries(vars)) {
    if (v) root.style.setProperty(k, v)
    else root.style.removeProperty(k)
  }
  document.title = b.name
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }
  icon.href = b.faviconUrl
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({ queryKey: BRANDING_KEY, queryFn: fetchBranding, staleTime: 5 * 60_000 })
  const branding = resolve(data)

  useEffect(() => applyToDocument(branding), [branding.name, branding.faviconUrl, branding.accentColor]) // eslint-disable-line react-hooks/exhaustive-deps

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>
}

/** Mantiene la marca al día cuando el admin la cambia (evento de la API). */
export function BrandingLiveUpdates() {
  const queryClient = useQueryClient()
  const onUpdate = useCallback((payload: Branding) => queryClient.setQueryData(BRANDING_KEY, payload), [queryClient])
  useSocketEvent<Branding>('branding_updated', onUpdate)
  return null
}

export function useBranding() {
  return useContext(BrandingContext)
}
