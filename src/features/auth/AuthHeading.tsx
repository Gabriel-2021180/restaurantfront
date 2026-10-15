import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'

export function AuthHeading({ title, subtitle, step }: { title: string; subtitle?: ReactNode; step?: { current: number; total: number } }) {
  return (
    <div className="flex flex-col gap-1.5">
      {step && (
        <div className="mb-3 flex gap-1.5" aria-hidden>
          {Array.from({ length: step.total }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < step.current ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
      )}
      <h1 className="text-[28px] leading-tight font-semibold">{title}</h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
