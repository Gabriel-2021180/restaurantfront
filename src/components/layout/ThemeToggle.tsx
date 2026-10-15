import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/providers/ThemeProvider'
import { cn } from '@/lib/utils'

/** Botón de claro/oscuro: el nuevo tema crece en círculo desde aquí. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  function onClick(e: MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }

  const icon = 'absolute size-[18px] transition-[opacity,transform,filter] duration-200 ease-out'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dark ? t('shell.user.themeLight') : t('shell.user.themeDark')}
      title={dark ? t('shell.user.themeLight') : t('shell.user.themeDark')}
      className={cn(
        'relative grid size-10 cursor-pointer place-items-center rounded-[10px] text-muted-foreground transition-[color,background-color,transform] duration-150 ease-out hover:bg-secondary hover:text-foreground active:scale-[0.94]',
        className,
      )}
    >
      <Sun className={cn(icon, dark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0 blur-[2px]')} />
      <Moon className={cn(icon, dark ? 'scale-50 rotate-90 opacity-0 blur-[2px]' : 'scale-100 rotate-0 opacity-100')} />
    </button>
  )
}
