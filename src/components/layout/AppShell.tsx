import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useMatch, useResolvedPath } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { MOBILE_TABS, NAV_GROUPS, type NavGroup, type NavItem } from '@/app/navigation'
import { BrandMark } from '@/components/brand/BrandMark'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NotificationAlerts } from '@/features/notifications/NotificationAlerts'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { WaiterReadyAlerts } from '@/features/service/WaiterReadyAlerts'
import { hasRole } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { ConnectionBanner } from './ConnectionBanner'
import { ErrorBoundary } from './ErrorBoundary'
import { UserMenu } from './UserMenu'
import { ThemeToggle } from './ThemeToggle'

function useVisibleNav(): NavGroup[] {
  const { user } = useAuth()
  return useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasRole(user, i.roles, i.strict)) })).filter(
        (g) => g.items.length > 0,
      ),
    [user],
  )
}

function SideLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t } = useTranslation()
  // El estado activo se calcula aquí y no con className={fn} de NavLink: el Tooltip (Slot de
  // Radix) concatena className como texto y convertía la función en una clase literal.
  const isActive = Boolean(useMatch({ path: useResolvedPath(item.to).pathname, end: item.to === '/' }))
  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={cn(
        'group flex h-10 items-center gap-3 rounded-[9px] px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        isActive && 'bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-card',
        collapsed && 'justify-center px-0 lg:justify-start lg:px-2.5',
      )}
    >
      <item.icon className={cn('size-[18px] shrink-0', isActive && 'text-[var(--brand)]')} strokeWidth={1.8} />
      <span className={cn('truncate', collapsed && 'hidden lg:inline')}>{t(item.labelKey)}</span>
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {t(item.labelKey)}
      </TooltipContent>
    </Tooltip>
  )
}

function NavList({ groups, collapsed = false, onNavigate }: { groups: NavGroup[]; collapsed?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-5" onClick={onNavigate}>
      {groups.map((g) => (
        <div key={g.labelKey} className="flex flex-col gap-0.5">
          <p className={cn('px-2.5 pb-1.5 text-xs text-muted-foreground', collapsed && 'hidden lg:block')}>{t(g.labelKey)}</p>
          {g.items.map((item) => (
            <SideLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </div>
      ))}
    </nav>
  )
}

function MobileTabs({ groups, onMore }: { groups: NavGroup[]; onMore: () => void }) {
  const { t } = useTranslation()
  const { role } = useAuth()
  const all = groups.flatMap((g) => g.items)
  const tabs = MOBILE_TABS[role].map((to) => all.find((i) => i.to === to)).filter((i): i is NavItem => Boolean(i))
  const showMore = all.length > tabs.length

  return (
    <nav
      aria-label={t('shell.nav.menu')}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-transform active:scale-95',
                  isActive && 'text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('size-[22px]', isActive && 'text-primary')} strokeWidth={1.8} />
                  <span className="max-w-full truncate px-1">{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        {showMore && (
          <li className="flex-1">
            <button
              type="button"
              onClick={onMore}
              className="flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-transform active:scale-95"
            >
              <Menu className="size-[22px]" strokeWidth={1.8} />
              {t('shell.nav.more')}
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}

/** Estructura de la app: barra lateral (PC), riel de íconos (tablet) y barra inferior (celular).
 * Tema y avisos viven en la barra lateral junto al usuario: no flotan sobre el contenido al bajar. */
export function AppShell() {
  const { t } = useTranslation()
  const { role } = useAuth()
  const groups = useVisibleNav()
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('shell.skip')}
      </a>
      <div className="aguayo-thread fixed inset-x-0 top-0 z-50" aria-hidden />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col border-r bg-background pt-[2px] md:flex lg:w-[232px]">
        <div className="flex h-16 items-center px-3.5 lg:px-4">
          <BrandMark withName={false} className="lg:hidden" />
          <BrandMark className="hidden lg:flex" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavList groups={groups} collapsed />
        </div>
        <div className="flex flex-col gap-1 border-t p-2">
          <div className="flex flex-col items-center gap-1 lg:flex-row lg:justify-start lg:px-0.5">
            <NotificationBell side="right" />
            <ThemeToggle />
          </div>
          <div className="hidden lg:block">
            <UserMenu />
          </div>
          <div className="flex justify-center lg:hidden">
            <UserMenu compact />
          </div>
        </div>
      </aside>

      <div className="md:pl-[72px] lg:pl-[232px]">
        <header className="flex h-14 items-center gap-2 border-b px-4 pt-[2px] md:hidden">
          <BrandMark />
          <div className="ml-auto flex items-center gap-0.5">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu compact />
          </div>
        </header>
        <ConnectionBanner />
        <main id="main" key={pathname} className="page-enter px-4 pt-4 pb-28 md:px-6 md:pt-8 md:pb-10 lg:px-8">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <MobileTabs groups={groups} onMore={() => setMoreOpen(true)} />
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SheetHeader className="px-0">
            <SheetTitle className="font-display">{t('shell.nav.menu')}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <NavList groups={groups} onNavigate={() => setMoreOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <NotificationAlerts />
      {/* La API solo avisa a quien atiende la orden: mesero o admin que tomó la mesa. */}
      {(role === 'waiter' || role === 'admin' || role === 'super-admin') && <WaiterReadyAlerts />}
    </div>
  )
}
