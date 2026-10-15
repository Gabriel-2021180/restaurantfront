import { MutationCache, QueryClient } from '@tanstack/react-query'

/**
 * Pestañas del mismo equipo (por ejemplo Mesas en una y Cocina en otra): cuando una guarda algo,
 * las demás releen lo que tienen en pantalla. Complementa al socket y funciona aunque este no conecte.
 */
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('resto-admin-sync')

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => channel?.postMessage('changed'),
  }),
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      // Al volver a la pestaña o recuperar la red, se relee lo que ya esté viejo.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

if (channel) channel.onmessage = () => void queryClient.invalidateQueries({ refetchType: 'active' })
