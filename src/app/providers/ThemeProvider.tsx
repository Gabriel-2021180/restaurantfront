import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
type Resolved = 'light' | 'dark'

/** Punto desde donde crece el nuevo tema (centro del botón que lo cambió). */
export type ThemeOrigin = { x: number; y: number }

interface ThemeContextValue {
  mode: ThemeMode
  theme: Resolved
  setMode: (mode: ThemeMode, origin?: ThemeOrigin) => void
  toggleTheme: (origin?: ThemeOrigin) => void
}

const STORAGE_KEY = 'theme-mode'
const ThemeContext = createContext<ThemeContextValue | null>(null)

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const mq = media()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme: Resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])

  const setMode = useCallback(
    (next: ThemeMode, origin?: ThemeOrigin) => {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* almacenamiento no disponible: el modo vale solo para esta sesión */
      }
      const nextTheme: Resolved = next === 'system' ? (media().matches ? 'dark' : 'light') : next
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (nextTheme === theme || reduce || !document.startViewTransition) {
        setModeState(next)
        return
      }
      revealTheme(nextTheme, origin, () => setModeState(next))
    },
    [theme],
  )

  const toggleTheme = useCallback((origin?: ThemeOrigin) => setMode(theme === 'dark' ? 'light' : 'dark', origin), [setMode, theme])

  const value = useMemo(() => ({ mode, theme, setMode, toggleTheme }), [mode, theme, setMode, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Cambio de tema con un círculo que crece desde el botón (View Transitions).
 * La clase se aplica dentro del callback para que la captura "nueva" ya tenga
 * el tema final; React se sincroniza justo después.
 */
function revealTheme(next: Resolved, origin: ThemeOrigin | undefined, commit: () => void) {
  const root = document.documentElement
  const x = origin?.x ?? window.innerWidth - 40
  const y = origin?.y ?? 32
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = document.startViewTransition(() => {
    root.classList.toggle('dark', next === 'dark')
    root.style.colorScheme = next
    commit()
  })
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 380, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {
      /* si el navegador cancela la transición, el tema igual quedó aplicado */
    })
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
