import { cn } from "@/lib/utils"

/** Bloque de carga con un brillo que recorre la forma del contenido. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("skeleton-shimmer rounded-md", className)} {...props} />
}

export { Skeleton }
