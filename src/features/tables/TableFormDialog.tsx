import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/feedback/confirm'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api/client'
import { useTableAdmin, type DiningTable } from './api'

const MAX_CAPACITY = 40

/** Alta y edición de mesas (solo el dueño). Valida antes de enviar y no permite números repetidos. */
export function TableFormDialog({ table, existing, onClose }: { table: DiningTable | null; existing: DiningTable[]; onClose: () => void }) {
  const { t } = useTranslation()
  const admin = useTableAdmin()
  const [number, setNumber] = useState(table ? String(table.table_number) : '')
  const [capacity, setCapacity] = useState(table?.capacity ?? 4)
  const [error, setError] = useState<string | null>(null)
  const saving = admin.create.isPending || admin.update.isPending || admin.remove.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = number.trim()
    if (!value) return setError(t('tablesPage.form.required'))
    const dup = existing.some((x) => x.id !== table?.id && String(x.table_number).trim().toLowerCase() === value.toLowerCase())
    if (dup) return setError(t('tablesPage.form.duplicate', { n: value }))
    setError(null)
    const input = { table_number: value, capacity }
    const done = {
      onSuccess: () => {
        toast.success(table ? t('tablesPage.form.updated', { n: value }) : t('tablesPage.form.created', { n: value }))
        onClose()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
    if (table) admin.update.mutate({ id: table.id, ...input }, done)
    else admin.create.mutate(input, done)
  }

  async function remove() {
    if (!table) return
    const ok = await confirm({
      title: t('tablesPage.form.deleteTitle', { n: table.table_number }),
      description: t('tablesPage.form.deleteDescription'),
      confirmText: t('tablesPage.form.delete'),
      tone: 'danger',
    })
    if (!ok) return
    admin.remove.mutate(table.id, {
      onSuccess: () => {
        toast.success(t('tablesPage.form.deleted', { n: table.table_number }))
        onClose()
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  const occupied = table?.status === 'occupied'

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={table ? t('tablesPage.form.editTitle', { n: table.table_number }) : t('tablesPage.newTable')}
      footer={
        <>
          {table && (
            <Button type="button" variant="ghost" className="h-11 text-destructive sm:mr-auto" onClick={remove} disabled={saving || occupied} title={occupied ? t('tablesPage.form.occupied') : undefined}>
              <Trash2 /> {t('tablesPage.form.delete')}
            </Button>
          )}
          <Button type="submit" form="table-form" className="h-11" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />} {t('tablesPage.form.save')}
          </Button>
        </>
      }
    >
      <form id="table-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
        <div className="grid gap-2">
          <Label htmlFor="table-number">{t('tablesPage.form.number')}</Label>
          <Input
            id="table-number"
            value={number}
            maxLength={20}
            autoFocus={!table}
            onChange={(e) => {
              setNumber(e.target.value)
              setError(null)
            }}
            placeholder={t('tablesPage.form.numberPlaceholder')}
            aria-invalid={!!error}
            aria-describedby="table-number-msg"
          />
          <p id="table-number-msg" className={error ? 'text-[13px] text-destructive' : 'text-[13px] text-muted-foreground'}>
            {error ?? t('tablesPage.form.numberHint')}
          </p>
        </div>
        <div className="grid gap-2">
          <Label id="table-capacity-label">{t('tablesPage.form.capacity')}</Label>
          <div className="flex items-center gap-3" role="group" aria-labelledby="table-capacity-label">
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setCapacity((c) => Math.max(1, c - 1))} disabled={capacity <= 1} aria-label={t('tablesPage.form.less')}>
              <Minus />
            </Button>
            <output className="w-12 text-center font-display text-2xl font-semibold tabular-nums" aria-live="polite">{capacity}</output>
            <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => setCapacity((c) => Math.min(MAX_CAPACITY, c + 1))} disabled={capacity >= MAX_CAPACITY} aria-label={t('tablesPage.form.more')}>
              <Plus />
            </Button>
            <span className="text-sm text-muted-foreground">{t('tablesPage.people', { count: capacity })}</span>
          </div>
        </div>
        {occupied && <p className="rounded-lg bg-secondary px-3 py-2.5 text-[13px] text-muted-foreground">{t('tablesPage.form.occupied')}</p>}
      </form>
    </ResponsivePanel>
  )
}
