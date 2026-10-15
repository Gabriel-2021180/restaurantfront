import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface State {
  error: Error | null
}

/** Si una pantalla falla, muestra un aviso con reintento en vez de dejar todo en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[pantalla]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="page-enter mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <TriangleAlert className="size-8 text-warning" />
        <div>
          <h1 className="text-2xl font-semibold">Algo falló en esta pantalla</h1>
          <p className="mt-1 text-muted-foreground">El resto del sistema sigue funcionando. Intenta de nuevo; si se repite, avisa al administrador.</p>
        </div>
        <Button onClick={() => this.setState({ error: null })}>
          <RotateCcw /> Reintentar
        </Button>
        {import.meta.env.DEV && <pre className="max-w-full overflow-x-auto rounded-lg bg-secondary px-3 py-2 text-left text-xs text-muted-foreground">{this.state.error.message}</pre>}
      </div>
    )
  }
}
