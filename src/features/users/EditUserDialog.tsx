import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/feedback/confirm'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api, { getErrorMessage } from '@/lib/api/client'
import { getDisplayName } from '@/lib/roles'
import { cn } from '@/lib/utils'
import type { User } from '@/types/auth'

interface Role {
  id: string
  name: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^[+\d\s-]{6,20}$/

/**
 * Edición de un usuario por el dueño: nombre, correo, teléfono y rol.
 * Cambiar correo o rol cierra las sesiones abiertas de esa persona (lo hace la API):
 * tendrá que volver a ingresar, con el correo nuevo si cambió.
 */
export function EditUserDialog({ user, roles, onClose }: { user: User; roles: Role[]; onClose: () => void }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const currentRoleId = typeof user.role === 'object' ? user.role?.id : undefined
  const [firstNames, setFirstNames] = useState(user.first_names ?? '')
  const [lastNames, setLastNames] = useState(user.last_names ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [roleId, setRoleId] = useState(currentRoleId ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: async (body: Record<string, string>) => (await api.patch(`/users/${user.id}`, body)).data,
    onSuccess: () => {
      toast.success(t('usersPage.edit.saved', { name: `${firstNames.trim()} ${lastNames.trim()}`.trim() }))
      void qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (firstNames.trim().length < 2) e.firstNames = t('usersPage.edit.nameRequired')
    if (lastNames.trim().length < 2) e.lastNames = t('usersPage.edit.nameRequired')
    if (!EMAIL.test(email.trim())) e.email = t('usersPage.edit.emailInvalid')
    if (phone.trim() && !PHONE.test(phone.trim())) e.phone = t('usersPage.edit.phoneInvalid')
    setErrors(e)
    if (Object.keys(e).length) return

    // Solo se envía lo que cambió.
    const body: Record<string, string> = {}
    if (firstNames.trim() !== (user.first_names ?? '')) body.first_names = firstNames.trim()
    if (lastNames.trim() !== (user.last_names ?? '')) body.last_names = lastNames.trim()
    const emailChanged = email.trim().toLowerCase() !== (user.email ?? '').toLowerCase()
    if (emailChanged) body.email = email.trim().toLowerCase()
    if (phone.trim() !== (user.phone ?? '')) body.phone = phone.trim()
    const roleChanged = Boolean(roleId) && roleId !== currentRoleId
    if (roleChanged) body.role_id = roleId
    if (!Object.keys(body).length) return onClose()

    if (emailChanged || roleChanged) {
      const ok = await confirm({
        title: t('usersPage.edit.confirmTitle', { name: getDisplayName(user) }),
        description: emailChanged ? t('usersPage.edit.confirmEmail', { email: body.email }) : t('usersPage.edit.confirmRole'),
        confirmText: t('usersPage.edit.save'),
      })
      if (!ok) return
    }
    save.mutate(body)
  }

  const err = (k: string) => errors[k] && <p className="text-[13px] text-destructive">{errors[k]}</p>

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !save.isPending && onClose()}
      title={t('usersPage.edit.title')}
      description={getDisplayName(user)}
      className="sm:max-w-lg"
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={save.isPending}>
            {t('reservationsPage.form.cancel')}
          </Button>
          <Button type="submit" form="edit-user" className="h-11" disabled={save.isPending}>
            {save.isPending && <LoaderCircle className="animate-spin" />} {t('usersPage.edit.save')}
          </Button>
        </>
      }
    >
      <form id="edit-user" onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4 pt-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-2">
            <Label htmlFor="eu-first">{t('usersPage.edit.firstNames')}</Label>
            <Input id="eu-first" value={firstNames} maxLength={80} autoComplete="off" onChange={(e) => setFirstNames(e.target.value)} aria-invalid={!!errors.firstNames} />
            {err('firstNames')}
          </div>
          <div className="grid content-start gap-2">
            <Label htmlFor="eu-last">{t('usersPage.edit.lastNames')}</Label>
            <Input id="eu-last" value={lastNames} maxLength={80} autoComplete="off" onChange={(e) => setLastNames(e.target.value)} aria-invalid={!!errors.lastNames} />
            {err('lastNames')}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="eu-email">{t('usersPage.edit.email')}</Label>
          <Input id="eu-email" type="email" inputMode="email" autoComplete="off" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
          {errors.email ? err('email') : <p className="text-[13px] text-muted-foreground">{t('usersPage.edit.emailHint')}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="eu-phone">{t('usersPage.edit.phone')}</Label>
          <Input id="eu-phone" type="tel" inputMode="tel" autoComplete="off" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />
          {err('phone')}
        </div>
        <div className="grid gap-2">
          <Label id="eu-role">{t('usersPage.edit.role')}</Label>
          <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-labelledby="eu-role">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={roleId === r.id}
                onClick={() => setRoleId(r.id)}
                className={cn(
                  'flex h-11 cursor-pointer items-center justify-between rounded-lg border px-3.5 text-left text-sm font-medium capitalize transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.98]',
                  roleId === r.id ? 'border-foreground/40 bg-primary-soft' : 'hover:bg-secondary',
                )}
              >
                {r.name}
                {roleId === r.id && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </div>
      </form>
    </ResponsivePanel>
  )
}
