import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PASSWORD_RULES } from './password'

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? t('login.hidePassword') : t('login.showPassword')}
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  )
}

/** Lista de requisitos que se marca mientras el usuario escribe. */
export function PasswordRequirements({ value }: { value: string }) {
  const { t } = useTranslation()
  return (
    <ul className="grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value)
        return (
          <li key={rule.key} className={cn('flex items-center gap-1.5 transition-colors', ok ? 'text-success' : 'text-muted-foreground')}>
            {ok ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-60" />}
            {t(`auth.register.password_strength.${rule.key}`)}
          </li>
        )
      })}
    </ul>
  )
}
