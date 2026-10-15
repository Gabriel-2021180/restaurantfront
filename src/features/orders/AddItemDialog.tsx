import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney } from '@/lib/format'

export interface AddTarget {
  id: string
  name: string
  price: number
  /** Máximo por stock (null = sin límite de stock). */
  max: number | null
  needsCode?: boolean
  subtitle?: string
}

interface Props {
  target: AddTarget | null
  onClose: () => void
  onConfirm: (input: { quantity: number; notes: string | null; code?: string }) => void
}

export function AddItemDialog({ target, onClose, onConfirm }: Props) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{target && <Body key={target.id} target={target} onConfirm={onConfirm} />}</DialogContent>
    </Dialog>
  )
}

function Body({ target, onConfirm }: { target: AddTarget; onConfirm: Props['onConfirm'] }) {
  const { t } = useTranslation()
  const limit = Math.max(1, Math.min(target.max ?? 99, 99))
  const [qty, setQty] = useState(1)
  const [raw, setRaw] = useState('1')
  const [notes, setNotes] = useState('')
  const [code, setCode] = useState('')

  const commit = (n: number) => {
    const v = Math.min(Math.max(1, n || 1), limit)
    setQty(v)
    setRaw(String(v))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (target.needsCode && !code.trim()) return
    onConfirm({ quantity: qty, notes: notes.trim() || null, code: target.needsCode ? code.trim().toUpperCase() : undefined })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">{target.name}</DialogTitle>
        <DialogDescription>
          {formatMoney(target.price)}
          {target.subtitle && ` · ${target.subtitle}`}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="qty">{t('order.quantity')}</Label>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon-lg" onClick={() => commit(qty - 1)} disabled={qty <= 1} aria-label="-1">
            <Minus />
          </Button>
          <Input
            id="qty"
            inputMode="numeric"
            value={raw}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
              setRaw(digits)
              if (digits) setQty(Math.min(Number(digits), limit))
            }}
            onBlur={() => commit(Number(raw))}
            className="h-12 w-20 text-center font-display text-2xl font-semibold"
          />
          <Button type="button" variant="outline" size="icon-lg" onClick={() => commit(qty + 1)} disabled={qty >= limit} aria-label="+1">
            <Plus />
          </Button>
        </div>
        {target.max != null && <p className="text-[13px] text-muted-foreground">{t('order.left', { n: target.max })}</p>}
      </div>

      {target.needsCode && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="promo-code">{t('order.promoCode')}</Label>
          <Input id="promo-code" autoFocus value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} className="font-semibold tracking-wider" />
          <p className="text-[13px] text-muted-foreground">{t('order.needsCode')}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t('order.notes')}</Label>
        <Textarea id="notes" rows={2} maxLength={200} placeholder={t('order.notesPlaceholder')} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <DialogFooter>
        <Button type="submit" size="lg" className="w-full" disabled={target.needsCode && !code.trim()}>
          {t('order.addN', { n: qty })} · {formatMoney(target.price * qty)}
        </Button>
      </DialogFooter>
    </form>
  )
}
