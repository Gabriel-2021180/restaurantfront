import { Skeleton } from '@/components/ui/skeleton'

type Variant = 'grid' | 'list' | 'dashboard' | 'form'

/** Esqueleto con la forma de la pantalla mientras cargan sus datos. */
export function PageFallback({ variant = 'grid' }: { variant?: Variant }) {
  return (
    <div className="flex flex-col gap-6 pt-1" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72 max-w-[70vw]" />
        </div>
        <Skeleton className="h-10 w-36 rounded-[10px]" />
      </div>

      {variant === 'grid' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {variant === 'list' && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      )}

      {variant === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </>
      )}

      {variant === 'form' && (
        <div className="flex max-w-2xl flex-col gap-4 rounded-xl border bg-card p-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-10 w-full rounded-[10px]" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
