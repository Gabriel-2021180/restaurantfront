import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/api/client'
import { authApi } from './api'
import { AuthHeading, FormError } from './AuthHeading'
import { AuthLayout } from './AuthLayout'
import { PasswordInput, PasswordRequirements } from './PasswordInput'
import { isStrongPassword } from './password'

type Step = 'email' | 'question' | 'reset'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  async function run(fn: () => Promise<void>, fallback?: string) {
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await fn()
    } catch (err) {
      setError(fallback ?? getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const onEmail = (e: FormEvent) => {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    void run(async () => {
      const res = await authApi.recoveryInit(clean)
      setEmail(clean)
      if (res.required_security_question) {
        setQuestion(res.question || t('forgotPassword.secretQuestionDefault'))
        setStep('question')
      } else {
        setStep('reset')
        toast.success(t('forgotPassword.codeSentToEmail'))
      }
    })
  }

  const onQuestion = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      await authApi.recoveryVerify(email, answer.trim())
      setStep('reset')
      toast.success(t('forgotPassword.verificationCodeSent'))
    }, t('forgotPassword.answerDoesNotMatch'))
  }

  const passwordOk = isStrongPassword(password)
  const matches = password === confirm

  const onReset = (e: FormEvent) => {
    e.preventDefault()
    if (!passwordOk) return setError(t('register.weakPassword'))
    if (!matches) return setError(t('register.passwordsDontMatch'))
    void run(async () => {
      await authApi.recoveryReset(email, code, password)
      toast.success(t('forgotPassword.passwordUpdated'), { description: t('forgotPassword.canNowLogin') })
      navigate('/login', { replace: true })
    })
  }

  const subtitle = {
    email: t('forgotPassword.enterEmailToFindAccount'),
    question: t('forgotPassword.answerSecretQuestion'),
    reset: t('forgotPassword.checkInbox'),
  }[step]

  return (
    <AuthLayout>
      <AuthHeading title={t('forgotPassword.recoverAccount')} subtitle={subtitle} />

      {step === 'email' && (
        <form onSubmit={onEmail} className="mt-8 flex flex-col gap-5">
          <FormError message={error} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-email">{t('forgotPassword.emailAddress')}</Label>
            <Input id="fp-email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" size="lg" disabled={loading || !email}>
            {loading && <LoaderCircle className="animate-spin" />} {t('forgotPassword.continue')}
          </Button>
        </form>
      )}

      {step === 'question' && (
        <form onSubmit={onQuestion} className="mt-8 flex flex-col gap-5">
          <FormError message={error} />
          <div className="rounded-[10px] border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('forgotPassword.question')}</p>
            <p className="mt-0.5 font-medium">{question}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-answer">{t('forgotPassword.yourAnswer')}</Label>
            <Input id="fp-answer" required autoFocus autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </div>
          <Button type="submit" size="lg" disabled={loading || !answer.trim()}>
            {loading && <LoaderCircle className="animate-spin" />} {t('forgotPassword.verify')}
          </Button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={onReset} className="mt-8 flex flex-col gap-5">
          <FormError message={error} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-code">{t('forgotPassword.sixDigitCode')}</Label>
            <Input
              id="fp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              className="text-center text-lg font-semibold tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <p className="text-[13px] text-muted-foreground">{t('forgotPassword.codeSentTo', { email })}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-pw">{t('forgotPassword.newPassword')}</Label>
            <PasswordInput id="fp-pw" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordRequirements value={password} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fp-pw2">{t('forgotPassword.confirmPassword')}</Label>
            <PasswordInput id="fp-pw2" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm.length > 0 && !matches && <p className="text-[13px] text-destructive">{t('register.passwordsDontMatch')}</p>}
          </div>
          <Button type="submit" size="lg" disabled={loading || code.length < 6 || !passwordOk || !matches}>
            {loading && <LoaderCircle className="animate-spin" />} {t('forgotPassword.changePassword')}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
