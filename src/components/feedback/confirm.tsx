import { useSyncExternalStore } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** 'danger' para acciones destructivas (eliminar, banear, cerrar caja). */
  tone?: 'default' | 'danger'
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

let pending: Pending | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Pide confirmación al usuario. Resuelve true si acepta. Uso: `if (await confirm({...}))`. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  pending?.resolve(false)
  return new Promise((resolve) => {
    pending = { ...options, resolve }
    emit()
  })
}

function settle(ok: boolean) {
  pending?.resolve(ok)
  pending = null
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Se monta una sola vez en la app. */
export function ConfirmHost() {
  const current = useSyncExternalStore(subscribe, () => pending)
  return (
    <AlertDialog open={Boolean(current)} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{current?.title}</AlertDialogTitle>
          {current?.description && <AlertDialogDescription>{current.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>{current?.cancelText ?? 'Cancelar'}</AlertDialogCancel>
          <AlertDialogAction
            variant={current?.tone === 'danger' ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {current?.confirmText ?? 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
