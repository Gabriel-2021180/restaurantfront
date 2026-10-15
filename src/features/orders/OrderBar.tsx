import { useTranslation } from 'react-i18next'
import { ChefHat, ChevronUp, LoaderCircle } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  units: number
  pendingUnits: number
  total: number
  sending: boolean
  /** Tanda recién enviada: mientras exista, la barra muestra la confirmación. */
  sentBatch: number | null
  onOpenTicket: () => void
  onSend: () => void
}

/** Check que se dibuja solo; con movimiento reducido aparece directo. */
function DrawnCheck() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="sent-check" />
    </svg>
  )
}

/**
 * Barra inferior de la comanda en celular: ver el pedido y enviar a cocina
 * con un solo toque. Al enviar, la barra confirma en el mismo lugar donde
 * el mesero tiene el pulgar, sin taparle el menú con un aviso.
 */
export function OrderBar({ units, pendingUnits, total, sending, sentBatch, onOpenTicket, onSend }: Props) {
  const { t } = useTranslation()
  const sent = sentBatch !== null

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 md:bottom-4 md:left-[calc(72px+1rem)] lg:hidden">
      <div
        className={cn(
          'relative flex h-14 items-stretch overflow-hidden rounded-xl text-background shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] transition-[background-color] duration-200 ease-out',
          sent ? 'bg-success' : 'bg-foreground',
        )}
      >
        {/* Estado normal: abrir pedido + enviar */}
        <div
          className={cn('flex min-w-0 flex-1 items-stretch transition-[opacity,transform,filter] duration-200 ease-out', sent && 'pointer-events-none -translate-y-2 opacity-0 blur-[2px]')}
          aria-hidden={sent}
        >
          <button type="button" onClick={onOpenTicket} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 pl-4 text-left transition-transform duration-150 ease-out active:scale-[0.98]">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{t('order.viewTicket')}</span>
              <span className="block truncate text-xs opacity-75">
                {t('order.items', { count: units })}
                {pendingUnits > 0 && ` · ${t('order.newItems', { n: pendingUnits })}`}
              </span>
            </span>
            <span className="font-display text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
            {pendingUnits === 0 && <ChevronUp className="mr-3 size-5 opacity-75" />}
          </button>
          {pendingUnits > 0 && (
            <button
              type="button"
              onClick={onSend}
              disabled={sending}
              className="m-1.5 ml-3 flex cursor-pointer items-center gap-2 rounded-lg bg-background px-3.5 text-sm font-semibold text-foreground transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-80"
            >
              {sending ? <LoaderCircle className="size-4 animate-spin" /> : <ChefHat className="size-4" />}
              {t('order.sendShort')}
            </button>
          )}
        </div>

        {/* Confirmación: misma caja, otro contenido */}
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-2.5 font-semibold transition-[opacity,transform,filter] duration-200 ease-out',
            sent ? 'opacity-100' : 'pointer-events-none translate-y-2 opacity-0 blur-[2px]',
          )}
        >
          {sent && (
            <>
              <DrawnCheck />
              <span>{t('order.sentBatch', { n: sentBatch })}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
