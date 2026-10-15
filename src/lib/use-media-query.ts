import { useSyncExternalStore } from 'react'

/** Lee un media query y se actualiza al cambiar el tamaño u orientación de la pantalla. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Celulares: pantallas angostas o táctiles sin mouse. */
export const useIsPhone = () => useMediaQuery('(max-width: 767px)')
