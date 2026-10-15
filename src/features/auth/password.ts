/** Política de contraseñas de la API: 8+ caracteres, mayúscula, minúscula y número o símbolo. */
export const PASSWORD_RULES = [
  { key: 'min_chars', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number_special', test: (p: string) => /[\d\W_]/.test(p) },
] as const

export const isStrongPassword = (p: string) => PASSWORD_RULES.every((r) => r.test(p))
