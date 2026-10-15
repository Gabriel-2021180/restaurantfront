import { useBranding } from '@/app/providers/BrandingProvider'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  /** Muestra el nombre junto al logo. */
  withName?: boolean
  subtitle?: string
  className?: string
}

/** Logo y nombre del restaurante (configurables por el admin). */
export function BrandMark({ withName = true, subtitle, className }: BrandMarkProps) {
  const { name, logoUrl } = useBranding()
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-[9px] object-cover" />
      {withName && (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-[15px] font-semibold">{name}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
