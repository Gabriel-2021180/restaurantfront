import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronDown, Languages, LogOut, MonitorSmartphone, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/feedback/confirm'
import api, { getErrorMessage } from '@/lib/api/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme, type ThemeMode } from '@/app/providers/ThemeProvider'
import { getDisplayName, initials } from '@/lib/roles'
import { cn } from '@/lib/utils'

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { mode, setMode } = useTheme()
  // El círculo del cambio de tema nace donde se tocó la opción.
  const pointer = useRef<{ x: number; y: number } | undefined>(undefined)
  const name = getDisplayName(user)
  const roleName = typeof user?.role === 'object' ? user?.role?.name : user?.role

  async function logoutEverywhere() {
    const ok = await confirm({
      title: t('shell.user.logoutAllTitle'),
      description: t('shell.user.logoutAllText'),
      confirmText: t('shell.user.logoutAll'),
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.post('/auth/logout-all')
      logout()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-[10px] p-1.5 text-left transition-colors outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
          !compact && 'w-full',
        )}
        aria-label={t('shell.user.profile')}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
          {initials(name) || <UserRound className="size-4" />}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-xs text-muted-foreground capitalize">{roleName}</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? 'end' : 'start'} side={compact ? 'bottom' : 'top'} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound /> {t('shell.user.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('shell.user.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onPointerDown={(e) => (pointer.current = { x: e.clientX, y: e.clientY })}
          onValueChange={(v) => setMode(v as ThemeMode, pointer.current)}
        >
          <DropdownMenuRadioItem value="system">
            <Monitor /> {t('shell.user.themeSystem')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun /> {t('shell.user.themeLight')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> {t('shell.user.themeDark')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => i18n.changeLanguage(i18n.language.startsWith('es') ? 'en' : 'es')}>
          <Languages /> {t('shell.user.language')}
          <span className="ml-auto text-xs font-semibold text-muted-foreground uppercase">{i18n.language.slice(0, 2)}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logoutEverywhere()}>
          <MonitorSmartphone /> {t('shell.user.logoutAll')}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut /> {t('shell.user.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
