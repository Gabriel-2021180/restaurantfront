import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AUTH_NOTICE_KEY, getErrorCode } from '@/lib/api/client'
import { formatTime } from '@/lib/format'
import { ROLE_HOME, getSystemRole } from '@/lib/roles'
import { AuthLayout } from './AuthLayout'

type LoginError = { message: string; locked?: boolean }

/** Motivo por el que la API cerró la sesión anterior; se muestra una sola vez. */
function takeNotice(): string | null {
  try {
    const v = sessionStorage.getItem(AUTH_NOTICE_KEY)
    sessionStorage.removeItem(AUTH_NOTICE_KEY)
    return v
  } catch {
    return null
  }
}

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<LoginError | null>(() => {
    const notice = takeNotice()
    if (!notice) return null
    return { message: notice === 'expired' ? t('login.errors.expired') : notice === 'revoked' ? t('login.errors.revoked') : notice }
  })

  function describe(err: unknown): LoginError {
    const code = getErrorCode(err)
    if (code === 'ACCOUNT_LOCKED') {
      const until = axios.isAxiosError<{ lockout_until?: string }>(err) ? err.response?.data?.lockout_until : undefined
      return {
        locked: true,
        message: until ? t('login.errors.locked', { time: formatTime(until, i18n.language) }) : t('login.errors.lockedGeneric'),
      }
    }
    if (code === 'ACCOUNT_BANNED') return { locked: true, message: t('login.errors.banned') }
    if (code === 'TOO_MANY_REQUESTS' || (axios.isAxiosError(err) && err.response?.status === 429)) return { message: t('login.errors.tooMany') }
    if (axios.isAxiosError(err) && !err.response) return { message: t('login.errors.network') }
    return { message: t('login.errors.invalid') }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : ROLE_HOME[getSystemRole(user)], { replace: true })
    } catch (err) {
      setError(describe(err))
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] leading-tight font-semibold">{t('login.title')}</h1>
        <p className="text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate={false}>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[10px] border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive"
          >
            {error.locked ? <Lock className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
            <span>{error.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('login.email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@restaurante.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Link to="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {t('login.forgot')}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          {loading && <LoaderCircle className="animate-spin" />}
          {loading ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('login.noAccount')}{' '}
        <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t('login.register')}
        </Link>
      </p>
    </AuthLayout>
  )
}
