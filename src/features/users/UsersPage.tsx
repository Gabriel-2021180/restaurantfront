import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Copy, LoaderCircle, MessageCircle, MoreHorizontal, Pencil, RotateCcw, Search, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { confirm } from '@/components/feedback/confirm'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader, Panel } from '@/components/page'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import api, { getErrorMessage } from '@/lib/api/client'
import { formatDate } from '@/lib/format'
import { getDisplayName, getSystemRole, initials } from '@/lib/roles'
import { cn } from '@/lib/utils'
import type { User } from '@/types/auth'
import { EditUserDialog } from './EditUserDialog'

interface Role {
  id: string
  name: string
  slug?: string
}
type StaffUser = User & { is_banned?: boolean; created_at?: string }
type Filter = 'all' | 'active' | 'banned'

const list = <T,>(d: T[] | { data: T[] } | null | undefined): T[] => (Array.isArray(d) ? d : (d?.data ?? []))

function InviteDialog({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const { t } = useTranslation()
  const [roleId, setRoleId] = useState('')
  const [copied, setCopied] = useState(false)
  const invite = useMutation({ mutationFn: async () => (await api.post<{ code: string; expires_at?: string }>('/users/invites', { role_id: roleId })).data })
  const code = invite.data?.code
  const role = roles.find((r) => r.id === roleId)
  const message = code ? t('usersPage.invite.whatsapp', { code, role: role?.name ?? '', url: `${window.location.origin}/register` }) : ''

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error(t('usersPage.invite.copyError'))
    }
  }

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && onClose()}
      title={t('usersPage.invite.title')}
      description={t('usersPage.invite.subtitle')}
      footer={
        code ? (
          <Button className="h-11" onClick={onClose}>{t('tablesPage.done')}</Button>
        ) : (
          <>
            <Button variant="outline" className="h-11" onClick={onClose}>{t('reservationsPage.form.cancel')}</Button>
            <Button className="h-11" disabled={!roleId || invite.isPending} onClick={() => invite.mutate(undefined, { onError: (e) => toast.error(getErrorMessage(e)) })}>
              {invite.isPending ? <LoaderCircle className="animate-spin" /> : <UserPlus />} {t('usersPage.invite.generate')}
            </Button>
          </>
        )
      }
    >
      {code ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-sm text-muted-foreground">{t('usersPage.invite.codeFor', { role: role?.name })}</p>
          <p className="font-display text-4xl font-semibold tracking-[0.2em] tabular-nums select-all">{code}</p>
          {invite.data?.expires_at && <p className="text-[13px] text-muted-foreground">{t('usersPage.invite.expires', { date: formatDate(invite.data.expires_at) })}</p>}
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="h-11 flex-1" onClick={() => void copy()}>
              {copied ? <Check /> : <Copy />} {copied ? t('usersPage.invite.copied') : t('usersPage.invite.copy')}
            </Button>
            <Button variant="outline" className="h-11 flex-1" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 pt-1" role="radiogroup" aria-label={t('usersPage.invite.role')}>
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={roleId === r.id}
              onClick={() => setRoleId(r.id)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors duration-150',
                roleId === r.id ? 'border-foreground/40 bg-primary-soft' : 'hover:bg-secondary',
              )}
            >
              <span>
                <span className="block font-medium capitalize">{r.name}</span>
                <span className="block text-[13px] text-muted-foreground">{t(`usersPage.roleHint.${getSystemRole({ role: r } as User)}`, { defaultValue: '' })}</span>
              </span>
              {roleId === r.id && <Check className="size-4" />}
            </button>
          ))}
        </div>
      )}
    </ResponsivePanel>
  )
}

export default function UsersPage() {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<StaffUser | null>(null)

  const users = useQuery({ queryKey: ['users'], queryFn: async () => list<StaffUser>((await api.get('/users')).data) })
  const roles = useQuery({
    queryKey: ['roles'],
    // El dueño no se invita: se crea al instalar el sistema.
    queryFn: async () => list<Role>((await api.get('/roles')).data).filter((r) => !`${r.slug ?? r.name}`.toLowerCase().includes('super')),
  })
  const ban = useMutation({
    mutationFn: async ({ id, is_banned }: { id: string; is_banned: boolean }) => (await api.patch(`/users/${id}`, { is_banned })).data,
    onSettled: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users.data ?? []).filter(
      (u) =>
        (filter === 'all' || (filter === 'banned' ? u.is_banned : !u.is_banned)) &&
        (!q || [getDisplayName(u), u.email].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [users.data, filter, query])
  const bannedCount = (users.data ?? []).filter((u) => u.is_banned).length

  async function toggleBan(u: StaffUser) {
    const banning = !u.is_banned
    const name = getDisplayName(u)
    const ok = await confirm({
      title: banning ? t('usersPage.banTitle', { name }) : t('usersPage.unbanTitle', { name }),
      description: banning ? t('usersPage.banText') : t('usersPage.unbanText'),
      confirmText: banning ? t('usersPage.ban') : t('usersPage.unban'),
      tone: banning ? 'danger' : 'default',
    })
    if (!ok) return
    ban.mutate(
      { id: u.id, is_banned: banning },
      { onSuccess: () => toast.success(banning ? t('usersPage.banned', { name }) : t('usersPage.unbanned', { name })), onError: (e) => toast.error(getErrorMessage(e)) },
    )
  }

  return (
    <Page>
      <PageHeader
        title={t('usersPage.title')}
        description={users.data ? t('usersPage.summary', { count: users.data.length, banned: bannedCount }) : ' '}
        actions={
          <Button onClick={() => setInviting(true)} disabled={!roles.data?.length}>
            <UserPlus /> <span className="max-[380px]:sr-only">{t('usersPage.invite.action')}</span>
          </Button>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterChips<Filter>
          label={t('usersPage.title')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('tablesPage.filter.all') },
            { value: 'active', label: t('usersPage.active') },
            { value: 'banned', label: t('usersPage.bannedFilter'), count: bannedCount || undefined },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('usersPage.search')} aria-label={t('usersPage.search')} className="h-10 pr-9 pl-9" />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground" aria-label={t('tablesPage.clearSearch')}>
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <Panel flush>
        {users.isLoading ? (
          <ul className="divide-y">{[0, 1, 2, 3].map((i) => <li key={i} className="flex items-center gap-3 px-5 py-4"><Skeleton className="size-9 rounded-full" /><div className="flex flex-col gap-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-52" /></div></li>)}</ul>
        ) : users.isError ? (
          <ErrorState error={users.error} onRetry={() => void users.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title={query || filter !== 'all' ? t('inventoryPage.noMatch') : t('usersPage.empty')} />
        ) : (
          <ul className="stagger-in divide-y">
            {rows.map((u) => {
              const isMe = u.id === me?.id
              const name = getDisplayName(u)
              const roleName = typeof u.role === 'object' ? u.role?.name : u.role
              return (
                <li key={u.id} className={cn('flex items-center gap-3 px-5 py-3.5', u.is_banned && 'opacity-60')}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[12px] font-semibold">{initials(name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {name} {isMe && <span className="text-[13px] font-normal text-muted-foreground">· {t('usersPage.you')}</span>}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm capitalize">{roleName || t('usersPage.noRole')}</p>
                    {u.created_at && <p className="text-[12px] text-muted-foreground">{t('usersPage.since', { date: formatDate(u.created_at) })}</p>}
                  </div>
                  {u.is_banned && <span className="text-[13px] font-medium text-destructive">{t('usersPage.bannedLabel')}</span>}
                  {!isMe && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9" aria-label={t('inventoryPage.actions', { name })}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onSelect={() => setEditing(u)}><Pencil /> {t('usersPage.edit.action')}</DropdownMenuItem>
                        {u.is_banned ? (
                          <DropdownMenuItem onSelect={() => void toggleBan(u)}><RotateCcw /> {t('usersPage.unban')}</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem variant="destructive" onSelect={() => void toggleBan(u)}><Ban /> {t('usersPage.ban')}</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      {editing && <EditUserDialog user={editing} roles={roles.data ?? []} onClose={() => setEditing(null)} />}
      {inviting && <InviteDialog roles={roles.data ?? []} onClose={() => setInviting(false)} />}
    </Page>
  )
}
