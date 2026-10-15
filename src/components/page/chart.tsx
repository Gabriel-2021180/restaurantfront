import type { ReactNode } from 'react'

/** Tooltip con el mismo aspecto que los popovers de la app. */
export function ChartTooltip({ title, rows }: { title?: ReactNode; rows: { label: ReactNode; value: ReactNode; color?: string }[] }) {
  return (
    <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-[13px] text-popover-foreground shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)]">
      {title && <p className="mb-1 font-medium">{title}</p>}
      {rows.map((r, i) => (
        <p key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular-nums">{r.value}</span>
        </p>
      ))}
    </div>
  )
}
