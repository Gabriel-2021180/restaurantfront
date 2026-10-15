/** Modo demo: solo en desarrollo, con `npm run dev:demo` (o VITE_DEMO=true). */
export const IS_DEMO = import.meta.env.DEV && (import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO === 'true')
