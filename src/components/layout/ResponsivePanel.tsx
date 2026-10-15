import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsPhone } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Hoja inferior en el celular (alcanzable con el pulgar) y diálogo centrado en
 * tablet/PC. Mismo contenido en ambos, para no mantener dos versiones.
 */
export function ResponsivePanel({ open, onOpenChange, title, description, children, footer, className }: Props) {
  const phone = useIsPhone()

  if (phone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn('max-h-[88dvh] gap-0 rounded-t-2xl px-0 pb-[env(safe-area-inset-bottom)]', className)}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
          <SheetHeader className="px-5 pt-3 pb-2 text-left">
            <SheetTitle className="pr-8 font-display text-xl">{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-md', className)}>
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="pr-8 font-display text-xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t px-6 py-4">{footer}</div>}
      </DialogContent>
    </Dialog>
  )
}
