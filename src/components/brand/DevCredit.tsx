import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** Crédito discreto del desarrollador (login y perfil, fuera de las pantallas de trabajo). */
export function DevCredit({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <p className={cn('text-center text-xs text-muted-foreground', className)}>
      {t('shell.credit')}{' '}
      <a
        href="https://www.linkedin.com/in/g-azurduy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        Gabriel Azurduy
      </a>
    </p>
  )
}
