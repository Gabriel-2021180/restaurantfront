/**
 * Paleta de gráficos del sistema: tinta para la serie principal, gris cálido
 * para la comparación y el color de marca solo para resaltar un dato.
 * Son variables CSS, así cambian solas con el tema claro/oscuro.
 */
export const CHART = {
  ink: 'var(--foreground)',
  muted: 'color-mix(in oklab, var(--muted-foreground) 45%, transparent)',
  brand: 'var(--brand)',
  grid: 'var(--border)',
  axis: 'var(--muted-foreground)',
  series: ['var(--foreground)', 'var(--brand)', 'var(--info)', 'var(--success)', 'var(--warning)'],
}

export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 12, fill: 'var(--muted-foreground)' },
} as const
