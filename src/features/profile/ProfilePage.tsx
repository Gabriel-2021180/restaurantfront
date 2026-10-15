import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, LoaderCircle, Mail, MonitorSmartphone } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { Page, PageHeader, Panel } from '@/components/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api, { AUTH_NOTICE_KEY, getErrorMessage } from '@/lib/api/client'
import { getDisplayName, getSystemRole, initials } from '@/lib/roles'
import type { User } from '@/types/auth'
import { PasswordInput, PasswordRequirements } from '@/features/auth/PasswordInput'
import { isStrongPassword } from '@/features/auth/password'

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** La API cierra la sesión al cambiar correo o contraseña: avisamos en el login y salimos. */
function signOutWith(message: string, logout: () => void) {
  try {
    sessionStorage.setItem(AUTH_NOTICE_KEY, message)
  } catch {
    /* sin almacenamiento: el login no muestra el aviso */
  }
  logout()
}

function EmailDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const isAdmin = ['admin', 'super-admin'].includes(getSystemRole(user))
  const [mode, setMode] = useState<'standard' | 'lost_access'>('standard')
  const [email, setEmail] = useState('')
  const [answer, setAnswer] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'form' | 'code'>('form')
  const [error, setError] = useState<string | null>(null)
  const needsAnswer = isAdmin || mode === 'lost_access'

  const request = useMutation({
    mutationFn: async () => (await api.post<{ step: 'done' | 'verify_code' }>('/users/request-email-change', { new_email: email.trim(), mode, security_answer: needsAnswer ? answer : undefined })).data,
    onSuccess: (r) => {
      if (r.step === 'done') signOutWith(t('profilePage.email.changedRelogin'), logout)
      else setStep('code')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })
  const verify = useMutation({
    mutationFn: async () => (await api.post('/users/verify-email-change', { code: code.trim() })).data,
    onSuccess: () => signOutWith(t('profilePage.email.changedRelogin'), logout),
    onError: (e) => setError(getErrorMessage(e)),
  })
  const busy = request.isPending || verify.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (step === 'code') {
      if (!/^\d{6}$/.test(code.trim())) return setError(t('profilePage.email.codeInvalid'))
      return verify.mutate()
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('profilePage.email.invalid'))
    if (needsAnswer && !answer.trim()) return setError(t('profilePage.email.answerRequired'))
    request.mutate()
  }

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !busy && onClose()}
      title={t('profilePage.email.title')}
      description={step === 'code' ? t('profilePage.email.codeSent', { email: user.email }) : t('profilePage.email.current', { email: user.email })}
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={busy}>{t('reservationsPage.form.cancel')}</Button>
          <Button type="submit" form="email-form" className="h-11" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />} {step === 'code' ? t('profilePage.email.confirm') : t('profilePage.email.continue')}
          </Button>
        </>
      }
    >
      <form id="email-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
        {step === 'form' ? (
          <>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('profilePage.email.title')}>
              {(['standard', 'lost_access'] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`cursor-pointer rounded-xl border p-3 text-left text-sm transition-colors ${mode === m ? 'border-foreground/40 bg-primary-soft' : 'hover:bg-secondary'}`}>
                  <span className="block font-medium">{t(`profilePage.email.mode.${m}`)}</span>
                  <span className="block text-[12px] text-muted-foreground">{t(`profilePage.email.mode.${m}Hint`)}</span>
                </button>
              ))}
            </div>
            <Field id="new-email" label={t('profilePage.email.new')}>
              <Input id="new-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            {needsAnswer && (
              <Field id="sec-answer" label={user.security_question || t('profilePage.email.answer')} hint={t('profilePage.email.answerHint')}>
                <Input id="sec-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" />
              </Field>
            )}
          </>
        ) : (
          <Field id="email-code" label={t('profilePage.email.code')}>
            <Input id="email-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="font-display text-xl tracking-[0.3em]" autoFocus />
          </Field>
        )}
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <p className="text-[13px] text-muted-foreground">{t('profilePage.email.signOutNote')}</p>
      </form>
    </ResponsivePanel>
  )
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser, logout } = useAuth()
  const [form, setForm] = useState({ first_names: user?.first_names ?? '', last_names: user?.last_names ?? '', phone: user?.phone ?? '', address: user?.address ?? '' })
  const [pwd, setPwd] = useState({ old: '', next: '', confirm: '' })
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const dirty = !!user && (form.first_names !== (user.first_names ?? '') || form.last_names !== (user.last_names ?? '') || form.phone !== (user.phone ?? '') || form.address !== (user.address ?? ''))

  const saveProfile = useMutation({
    mutationFn: async () => {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== ''))
      return (await api.patch<User>('/users/profile', body)).data
    },
    onSuccess: (u) => {
      updateUser(u)
      toast.success(t('profilePage.saved'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const changePassword = useMutation({
    mutationFn: async () => (await api.patch('/users/change-password', { old_password: pwd.old, new_password: pwd.next })).data,
    onSuccess: () => signOutWith(t('profilePage.password.changedRelogin'), logout),
    onError: (e) => setPwdError(getErrorMessage(e)),
  })

  function submitPassword(e: FormEvent) {
    e.preventDefault()
    if (!pwd.old) return setPwdError(t('profilePage.password.oldRequired'))
    if (!isStrongPassword(pwd.next)) return setPwdError(t('profilePage.password.weak'))
    if (pwd.next !== pwd.confirm) return setPwdError(t('register.passwordsDontMatch'))
    setPwdError(null)
    void confirm({ title: t('profilePage.password.confirmTitle'), description: t('profilePage.password.confirmText'), confirmText: t('profilePage.password.save') }).then((ok) => ok && changePassword.mutate())
  }

  async function logoutAll() {
    const ok = await confirm({ title: t('shell.user.logoutAllTitle'), description: t('shell.user.logoutAllText'), confirmText: t('shell.user.logoutAll'), tone: 'danger' })
    if (!ok) return
    try {
      await api.post('/auth/logout-all')
      logout()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!user) return null
  const name = getDisplayName(user)
  const roleName = typeof user.role === 'object' ? user.role?.name : user.role

  return (
    <Page width="narrow">
      <PageHeader title={t('profilePage.title')} />
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-foreground font-display text-lg font-semibold text-background">{initials(name)}</span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold">{name}</p>
          <p className="truncate text-sm text-muted-foreground capitalize">{roleName} · {user.email}</p>
        </div>
      </div>

      <Panel title={t('profilePage.personal')} description={t('profilePage.personalHint')}>
        <form onSubmit={(e) => { e.preventDefault(); saveProfile.mutate() }} className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-first" label={t('profilePage.firstNames')}><Input id="pf-first" autoComplete="given-name" value={form.first_names} onChange={(e) => setForm({ ...form, first_names: e.target.value })} /></Field>
          <Field id="pf-last" label={t('profilePage.lastNames')}><Input id="pf-last" autoComplete="family-name" value={form.last_names} onChange={(e) => setForm({ ...form, last_names: e.target.value })} /></Field>
          <Field id="pf-phone" label={t('profilePage.phone')}><Input id="pf-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field id="pf-address" label={t('profilePage.address')}><Input id="pf-address" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" disabled={!dirty || saveProfile.isPending}>
              {saveProfile.isPending && <LoaderCircle className="animate-spin" />} {t('settings.save')}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={t('profilePage.email.title')} action={<Mail className="size-4 text-muted-foreground" />}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm">{user.email}</p>
          <Button variant="outline" onClick={() => setEmailOpen(true)}>{t('profilePage.email.change')}</Button>
        </div>
      </Panel>

      <Panel title={t('profilePage.password.title')} description={t('profilePage.password.hint')} action={<KeyRound className="size-4 text-muted-foreground" />}>
        <form onSubmit={submitPassword} noValidate className="grid gap-4">
          <Field id="pw-old" label={t('profilePage.password.old')}><PasswordInput id="pw-old" autoComplete="current-password" value={pwd.old} onChange={(e) => setPwd({ ...pwd, old: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pw-new" label={t('profilePage.password.new')}><PasswordInput id="pw-new" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
            <Field id="pw-confirm" label={t('profilePage.password.repeat')}><PasswordInput id="pw-confirm" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
          </div>
          {pwd.next && <PasswordRequirements value={pwd.next} />}
          {pwdError && <p className="text-[13px] text-destructive">{pwdError}</p>}
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={changePassword.isPending}>
              {changePassword.isPending && <LoaderCircle className="animate-spin" />} {t('profilePage.password.save')}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title={t('profilePage.sessions')} action={<MonitorSmartphone className="size-4 text-muted-foreground" />}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[46ch] text-sm text-muted-foreground">{t('profilePage.sessionsHint')}</p>
          <Button variant="outline" className="text-destructive" onClick={() => void logoutAll()}>{t('shell.user.logoutAll')}</Button>
        </div>
      </Panel>

      {emailOpen && <EmailDialog user={user} onClose={() => setEmailOpen(false)} />}
    </Page>
  )
}
