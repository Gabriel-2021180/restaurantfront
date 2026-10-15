import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Solo rutas internas de la app ("/tables"), nunca "//otro-sitio.com" ni "javascript:". */
export function safeInternalPath(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null
  return url
}
