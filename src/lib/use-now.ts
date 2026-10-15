import { useEffect, useState } from 'react'

/** Hora actual que se renueva cada `intervalMs`: tiempos transcurridos y "en 15 min" se mantienen vivos. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
