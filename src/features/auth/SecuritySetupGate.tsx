import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api, { getErrorMessage } from '@/lib/api/client'
import type { User } from '@/types/auth'
import { AuthHeading, FormError } from './AuthHeading'
import { AuthLayout } from './AuthLayout'
import { isStrongPassword } from './password'
import { PasswordInput, PasswordRequirements } from './PasswordInput'

/**
 * Antes de usar el panel: quien tenga contraseña temporal la cambia (todos los
 * roles) y luego cada cuenta (salvo el super-admin) configura su pregunta de
 * seguridad, que se usa para recuperar la cuenta.
 */
export function SecuritySetupGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.is_password_temporary) return <TemporaryPasswordGate />
  return <SecurityQuestionGate>{children}</SecurityQuestionGate>
}

function TemporaryPasswordGate() {
  const { user, login, updateUser, logout } = useAuth()
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!isStrongPassword(next)) return setError(t('passwordChange.weak'))
    if (next === current) return setError(t('passwordChange.same'))
    if (next !== repeat) return setError(t('passwordChange.mismatch'))
    setError(null)
    setLoading(true)
    try {
      await api.patch('/users/change-password', { old_password: current, new_password: next })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
      return
    }
    // La API invalida todas las sesiones al cambiar la contraseña (incluida esta):
    // se vuelve a entrar con la nueva para no echar al usuario segundos después.
    try {
      const fresh = await login(user!.email, next)
      updateUser({ ...fresh, is_password_temporary: false })
      toast.success(t('passwordChange.saved'))
    } catch {
      toast.success(t('passwordChange.saved'), { description: t('passwordChange.relogin') })
      logout()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthHeading title={t('passwordChange.title')} subtitle={t('passwordChange.subtitle')} />
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <FormError message={error} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="tp-current">{t('passwordChange.current')}</Label>
          <PasswordInput id="tp-current" required autoFocus autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tp-next">{t('passwordChange.next')}</Label>
          <PasswordInput id="tp-next" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordRequirements value={next} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tp-repeat">{t('passwordChange.repeat')}</Label>
          <PasswordInput id="tp-repeat" required autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </div>
        <Button type="submit" size="lg" disabled={loading || !current || !next || !repeat}>
          {loading && <LoaderCircle className="animate-spin" />} {t('passwordChange.button')}
        </Button>
        <Button type="button" variant="ghost" onClick={logout}>
          {t('passwordChange.logout')}
        </Button>
      </form>
    </AuthLayout>
  )
}

function SecurityQuestionGate({ children }: { children: ReactNode }) {
  const { user, role, updateUser } = useAuth()
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsSetup = Boolean(user) && !user?.security_question && role !== 'super-admin'
  if (!needsSetup) return children

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.patch<User>('/auth/security-question', {
        new_question: question.trim(),
        new_answer: answer.trim(),
        current_password: password,
      })
      updateUser(data)
      toast.success(t('securitySetup.saved'))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthHeading title={t('securitySetup.title')} subtitle={t('securitySetup.subtitle')} />
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <FormError message={error} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="sq">{t('securitySetup.securityQuestion')}</Label>
          <Input id="sq" required autoFocus placeholder={t('securitySetup.placeholderQuestion')} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sa">{t('securitySetup.secretAnswer')}</Label>
          <Input id="sa" required autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sp">{t('securitySetup.currentPassword')}</Label>
          <PasswordInput
            id="sp"
            required
            autoComplete="current-password"
            placeholder={t('securitySetup.placeholderPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" disabled={loading || !question.trim() || !answer.trim() || !password}>
          {loading && <LoaderCircle className="animate-spin" />} {t('securitySetup.button')}
        </Button>
      </form>
    </AuthLayout>
  )
}
