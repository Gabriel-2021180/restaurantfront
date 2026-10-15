/** Limpia lo que escribe el usuario: solo dígitos y un separador decimal, máximo 2 decimales. */
export function sanitizeAmount(raw: string, decimals = 2): string {
  const s = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const [int, ...rest] = s.split('.')
  if (!rest.length) return int.replace(/^0+(?=\d)/, '')
  return `${int.replace(/^0+(?=\d)/, '') || '0'}.${rest.join('').slice(0, decimals)}`
}

export const parseAmount = (v: string) => (v === '' ? null : Number(v))
