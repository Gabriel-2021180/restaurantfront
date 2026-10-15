import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { sanitizeAmount } from '@/lib/amount'
import { cn } from '@/lib/utils'

interface MoneyInputProps extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  value: string
  onValueChange: (v: string) => void
  /** Prefijo visible (Bs). */
  prefix?: string
  decimals?: number
}

/**
 * Campo de monto: empieza vacío (nunca precargado con 0), teclado numérico en
 * celular y validación mientras se escribe.
 */
export function MoneyInput({ value, onValueChange, prefix = 'Bs', decimals = 2, className, ...props }: MoneyInputProps) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange(sanitizeAmount(e.target.value, decimals))}
        className={cn('tabular-nums', prefix && 'pl-10', className)}
      />
    </div>
  )
}
