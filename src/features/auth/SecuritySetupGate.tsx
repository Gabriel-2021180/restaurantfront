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
import { PasswordInput } from './PasswordInput'

/**
 * Antes de usar el panel, cada cuenta (salvo el super-admin) configura su
 * pregunta de seguridad, que se usa para recuperar la cuenta.
 */
export function SecuritySetupGate({ children }: { children: ReactNode }) {
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
