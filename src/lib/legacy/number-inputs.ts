/**
 * Protección global para los <input type="number"> de las pantallas aún no migradas:
 * - bloquea letras que el navegador sí acepta en campos numéricos (e, E, +, -)
 * - evita que la rueda del mouse cambie el valor sin querer al hacer scroll.
 * Las pantallas nuevas usan campos de texto con inputMode y validación propia.
 */
const BLOCKED = new Set(['e', 'E', '+', '-'])

export function installNumberInputGuards() {
  document.addEventListener(
    'keydown',
    (e) => {
      const el = e.target
      if (el instanceof HTMLInputElement && el.type === 'number' && BLOCKED.has(e.key)) e.preventDefault()
    },
    true,
  )
  document.addEventListener(
    'wheel',
    () => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement && el.type === 'number') el.blur()
    },
    { passive: true, capture: true },
  )
}
