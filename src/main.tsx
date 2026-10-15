import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/app/App'
import './index.css'
import { api } from '@/lib/api/client'
import { installNumberInputGuards } from '@/lib/legacy/number-inputs'

installNumberInputGuards()

// Condición escrita en línea para que el build de producción elimine el modo demo.
if (import.meta.env.DEV && (import.meta.env.MODE === 'demo' || import.meta.env.VITE_DEMO === 'true')) {
  const { enableDemo } = await import('@/lib/demo')
  enableDemo(api)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
