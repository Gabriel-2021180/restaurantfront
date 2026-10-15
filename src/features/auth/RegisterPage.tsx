import { useState, type ComponentProps, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api/client'
import { authApi, type InviteInfo } from './api'
import { AuthHeading, FormError } from './AuthHeading'
import { AuthLayout } from './AuthLayout'
import { PasswordInput, PasswordRequirements } from './PasswordInput'
import { isStrongPassword } from './password'

type Step = 1 | 2 | 3

const EMPTY = { first_names: '', last_names: '', ci: '', phone: '', address: '', password: '', confirm: '', email_code: '' }
type FormState = typeof EMPTY

function Field({ id, label, ...props }: { id: string; label: string } & ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} required {...props} />
    </div>
  )
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY)

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function run(fn: () => Promise<void>) {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const goTo = (s: Step) => {
    setError(null)
    setStep(s)
  }

  const onValidateInvite = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      try {
        setInvite(await authApi.validateInvite(inviteCode.trim()))
      } catch {
        throw new Error(t('register.invalidOrExpiredCode'))
      }
      goTo(2)
    })
  }

  const onRequestCode = (e: FormEvent) => {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    void run(async () => {
      await authApi.requestEmailCode(clean)
      setEmail(clean)
      goTo(3)
      toast.success(t('register.codeSent'), { description: t('register.checkInboxForCode', { email: clean }) })
    })
  }

  const passwordOk = isStrongPassword(form.password)
  const matches = form.password === form.confirm

  const onRegister = (e: FormEvent) => {
    e.preventDefault()
    if (!passwordOk) return setError(t('register.weakPassword'))
    if (!matches) return setError(t('register.passwordsDontMatch'))
    void run(async () => {
      const { confirm: _confirm, ...rest } = form
      await authApi.register({ ...rest, email, invite_code: inviteCode.trim() })
      toast.success(t('register.welcome'), { description: t('register.accountCreatedSuccessfully') })
      navigate('/login', { replace: true })
    })
  }

  const stepInfo = { current: step, total: 3 }

  return (
    <AuthLayout>
      {step === 1 && (
        <>
          <AuthHeading step={stepInfo} title={t('register.welcomeToTeam')} subtitle={t('register.enterAdminCode')} />
          <form onSubmit={onValidateInvite} className="mt-8 flex flex-col gap-5">
            <FormError message={error} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite">{t('register.inviteCodePlaceholder')}</Label>
              <Input
                id="invite"
                autoFocus
                autoComplete="off"
                className="text-center font-semibold tracking-[0.2em] uppercase"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !inviteCode.trim()}>
              {loading && <LoaderCircle className="animate-spin" />} {t('register.validateCode')}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm">
            <Link to="/login" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t('register.backToLogin')}
            </Link>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <AuthHeading step={stepInfo} title={t('register.verifyEmail')} subtitle={t('register.sendSecurityCode')} />
          {invite?.role_name && (
            <Badge variant="success" className="mt-4">
              {t('register.roleDetected', { role: invite.role_name })}
            </Badge>
          )}
          <form onSubmit={onRequestCode} className="mt-6 flex flex-col gap-5">
            <FormError message={error} />
            <Field id="reg-email" label={t('register.email')} type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={() => goTo(1)} aria-label={t('register.back')}>
                <ArrowLeft />
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={loading || !email}>
                {loading && <LoaderCircle className="animate-spin" />} {t('register.sendCode')}
              </Button>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <AuthHeading step={stepInfo} title={t('register.almostReady')} subtitle={t('register.codeSentToEmailCompleteData', { email })} />
          <form onSubmit={onRegister} className="mt-6 flex flex-col gap-4">
            <FormError message={error} />
            <Field
              id="code"
              label={t('register.gmailCode')}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              className="text-center text-lg font-semibold tracking-[0.4em]"
              value={form.email_code}
              onChange={(e) => setForm((f) => ({ ...f, email_code: e.target.value.replace(/\D/g, '') }))}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="first" label={t('register.firstNames')} value={form.first_names} onChange={set('first_names')} autoComplete="given-name" />
              <Field id="last" label={t('register.lastNames')} value={form.last_names} onChange={set('last_names')} autoComplete="family-name" />
              <Field id="ci" label={t('register.ci')} value={form.ci} onChange={set('ci')} inputMode="numeric" />
              <Field id="phone" label={t('register.phone')} value={form.phone} onChange={set('phone')} type="tel" autoComplete="tel" />
            </div>
            <Field id="address" label={t('register.address')} value={form.address} onChange={set('address')} autoComplete="street-address" />
            <div className="flex flex-col gap-2">
              <Label htmlFor="pw">{t('register.newPassword')}</Label>
              <PasswordInput
                id="pw"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={set('password')}
                aria-invalid={form.password.length > 0 && !passwordOk}
              />
              <PasswordRequirements value={form.password} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pw2">{t('register.confirmPassword')}</Label>
              <PasswordInput
                id="pw2"
                autoComplete="new-password"
                required
                value={form.confirm}
                onChange={set('confirm')}
                aria-invalid={form.confirm.length > 0 && !matches}
              />
              {form.confirm.length > 0 && !matches && <p className="text-[13px] text-destructive">{t('register.passwordsDontMatch')}</p>}
            </div>
            <div className="mt-2 flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={() => goTo(2)} aria-label={t('register.back')}>
                <ArrowLeft />
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={loading || !passwordOk || !matches || form.email_code.length < 6}>
                {loading && <LoaderCircle className="animate-spin" />} {t('register.finishRegistration')}
              </Button>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
