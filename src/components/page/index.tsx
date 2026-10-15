/**
 * Piezas comunes de página: todas las pantallas se arman con esto para que
 * títulos, paneles, cifras, vacíos y errores se vean y se comporten igual.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, RotateCcw, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>}
    </header>
  )
}

/** Contenedor de página: ancho máximo y ritmo vertical únicos. */
export function Page({ children, width = 'default', className }: { children: ReactNode; width?: 'narrow' | 'default' | 'wide'; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full flex-col gap-6', width === 'narrow' ? 'max-w-3xl' : width === 'wide' ? 'max-w-7xl' : 'max-w-6xl', className)}>
      {children}
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** Sin padding interno: para listas y tablas que llegan al borde. */
  flush?: boolean
}) {
  return (
    <section className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('min-h-0 flex-1', !flush && 'px-5 pb-5', !flush && !title && !action && 'pt-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  loading,
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  /** Variación en % contra el periodo anterior. */
  trend?: number | null
  icon?: LucideIcon
  loading?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {Icon && <Icon className="size-3.5" />} {label}
      </p>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <p className="truncate font-display text-[clamp(1.125rem,4.6vw,1.625rem)] leading-none font-semibold tracking-tight">{value}</p>
      )}
      {(hint || trend != null) && !loading && (
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {trend != null && Number.isFinite(trend) && (
            <span className={cn('inline-flex items-center font-medium', trend >= 0 ? 'text-success' : 'text-destructive')}>
              {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {hint}
        </p>
      )}
    </div>
  )
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>
}

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <Icon className="size-7 text-muted-foreground" />
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, title, className }: { error: unknown; onRetry?: () => void; title?: ReactNode; className?: string }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <AlertTriangle className="size-7 text-warning" />
      <div>
        <p className="font-semibold">{title ?? t('page.loadError')}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw /> {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

/** Fila de filtros tipo píldora; en celular se desliza horizontal sin barra visible. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; count?: number }[]
  label: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary',
            value === o.value && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
          )}
        >
          {o.label}
          {o.count != null && <span className="text-[12px] text-muted-foreground tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Barra horizontal de proporción (rankings): tinta sobre gris, sin colores extra. */
export function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0
  return (
    <span className={cn('block h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)} aria-hidden>
      <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${pct}%` }} />
    </span>
  )
}
