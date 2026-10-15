/**
 * Utilidades para el color de marca configurable por restaurante.
 * Garantizan contraste AA del acento elegido en ambos temas.
 */
type RGB = [number, number, number]

const hexToRgb = (hex: string): RGB | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const rgbToHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

const luminance = ([r, g, b]: RGB) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const WHITE: RGB = [255, 255, 255]
const LIGHT_SURFACE: RGB = [255, 255, 255]
const DARK_SURFACE: RGB = [0x22, 0x1f, 0x1c]
const DARK_INK: RGB = [0x19, 0x17, 0x15]

/** Oscurece/aclara el color hasta llegar a contraste 4.5 contra la superficie. */
function ensureContrast(color: RGB, surface: RGB, toward: RGB): RGB {
  let c = color
  for (let i = 0; i < 20 && contrast(c, surface) < 4.5; i++) c = mix(c, toward, 0.08)
  return c
}

const bestForeground = (bg: RGB): string => (contrast(bg, WHITE) >= contrast(bg, DARK_INK) ? '#ffffff' : rgbToHex(DARK_INK))

export interface BrandPalette {
  brand: string
  brandForeground: string
  brandDark: string
  brandDarkForeground: string
}

export function buildBrandPalette(hex: string | null | undefined): BrandPalette | null {
  const rgb = hex ? hexToRgb(hex) : null
  if (!rgb) return null
  const light = ensureContrast(rgb, LIGHT_SURFACE, [0, 0, 0])
  const dark = ensureContrast(mix(rgb, WHITE, 0.15), DARK_SURFACE, WHITE)
  return {
    brand: rgbToHex(light),
    brandForeground: bestForeground(light),
    brandDark: rgbToHex(dark),
    brandDarkForeground: bestForeground(dark),
  }
}
