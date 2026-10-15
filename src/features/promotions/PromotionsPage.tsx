import { useMemo, useState } from 'react'
import { ArchiveRestore, MoreHorizontal, Package, Pencil, Percent, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type { Promotion } from '@/types/menu'
import { useActivePromotions, useDeletePromotion, usePromotions, usePromotionsTrash, useRestorePromotion, useTogglePromotion } from './api'
import { STATUS_META, itemsLabel, pricingLabel, promoStatus, scheduleLabel, type PromoStatus } from './format'
import { PromotionEditor } from './PromotionEditor'

type Filter = 'all' | 'bundle' | 'discount' | 'trash'

const TONE: Record<string, string> = {
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
  destructive: 'text-destructive',
}

function StatusDot({ status }: { status: PromoStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', TONE[meta.tone])}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  )
}

function PromoRow({ promo, canManage, trashed, onEdit }: { promo: Promotion; canManage: boolean; trashed?: boolean; onEdit: (p: Promotion) => void }) {
  const toggle = useTogglePromotion()
  const remove = useDeletePromotion()
  const restore = useRestorePromotion()
  const status = promoStatus(promo)
  const Icon = promo.kind === 'bundle' ? Package : Percent

  async function onDelete() {
    const ok = await confirm({ title: `¿Enviar "${promo.name}" a la papelera?`, description: 'Deja de aplicarse de inmediato. Puedes restaurarla después.', confirmText: 'Enviar a la papelera', tone: 'danger' })
    if (!ok) return
    remove.mutate(promo.id, { onSuccess: () => toast.success('Promoción en la papelera'), onError: (e) => toast.error(getErrorMessage(e)) })
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{promo.name}</p>
            {promo.code && <Badge variant="outline" className="font-semibold tracking-wider">{promo.code}</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{itemsLabel(promo)}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {scheduleLabel(promo)}
            {promo.max_uses != null && ` · ${promo.uses}/${promo.max_uses} usos`}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 pl-12 sm:justify-end sm:pl-0">
        <div className="text-left sm:text-right">
          <p className="font-display text-[17px] font-semibold">{pricingLabel(promo)}</p>
          {!trashed && <StatusDot status={status} />}
        </div>
        {canManage && !trashed && (
          <div className="flex items-center gap-1">
            <Switch
              checked={promo.is_active}
              onCheckedChange={(is_active) => toggle.mutate({ id: promo.id, is_active }, { onError: (e) => toast.error(getErrorMessage(e)) })}
              aria-label={promo.is_active ? 'Pausar' : 'Activar'}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(promo)}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 /> Enviar a la papelera
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {canManage && trashed && (
          <Button variant="outline" size="sm" onClick={() => restore.mutate(promo.id, { onSuccess: () => toast.success('Promoción restaurada') })}>
            <ArchiveRestore /> Restaurar
          </Button>
        )}
      </div>
    </li>
  )
}

export default function PromotionsPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(['admin'])
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const all = usePromotions(canManage)
  const trash = usePromotionsTrash(canManage && filter === 'trash')
  const active = useActivePromotions()

  const list = useMemo(() => {
    if (!canManage) return active.data ?? []
    if (filter === 'trash') return trash.data ?? []
    const data = all.data ?? []
    return filter === 'all' ? data : data.filter((p) => p.kind === filter)
  }, [canManage, filter, all.data, trash.data, active.data])

  const loading = canManage ? (filter === 'trash' ? trash.isLoading : all.isLoading) : active.isLoading
  const liveCount = (all.data ?? []).filter((p) => promoStatus(p) === 'live').length

  const openEditor = (p: Promotion | null) => {
    setEditing(p)
    setEditorOpen(true)
  }

  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'bundle', label: 'Combos' },
    { value: 'discount', label: 'Descuentos' },
    { value: 'trash', label: 'Papelera' },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold">Promociones</h1>
          <p className="mt-1 text-muted-foreground">
            {canManage ? `${liveCount} activa${liveCount === 1 ? '' : 's'} ahora · combos y descuentos con fechas, días y horario` : 'Lo que puedes ofrecer ahora mismo'}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => openEditor(null)}>
            <Plus /> Nueva promoción
          </Button>
        )}
      </div>

      {canManage && (
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'h-9 shrink-0 cursor-pointer rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary',
                filter === f.value && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {loading ? (
          <ul className="divide-y">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-5 w-24" />
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Package className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">{filter === 'trash' ? 'La papelera está vacía' : canManage ? 'Todavía no hay promociones' : 'No hay promociones vigentes ahora'}</p>
              {canManage && filter !== 'trash' && (
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">Crea un combo como "1 vacío + 2 costillas" a precio especial, o un descuento por días y horario.</p>
              )}
            </div>
            {canManage && filter !== 'trash' && (
              <Button variant="outline" onClick={() => openEditor(null)}>
                <Plus /> Crear la primera
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {list.map((p) => (
              <PromoRow key={p.id} promo={p} canManage={canManage} trashed={filter === 'trash'} onEdit={openEditor} />
            ))}
          </ul>
        )}
      </div>

      {canManage && <PromotionEditor open={editorOpen} onOpenChange={setEditorOpen} promotion={editing} />}
    </div>
  )
}
