import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArchiveRestore, ArrowLeft, Layers, LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/feedback/confirm'
import { ResponsivePanel } from '@/components/layout/ResponsivePanel'
import { EmptyState, ErrorState, FilterChips, Page, PageHeader, Panel } from '@/components/page'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/api/client'
import { useCategoriesQuery, useProductsQuery } from '@/features/menu/api'
import type { Category } from '@/types/menu'
import { useCategoriesTrash, useCategoryActions } from './api'

function CategoryForm({ category, existing, onClose }: { category: Category | null; existing: Category[]; onClose: () => void }) {
  const { t } = useTranslation()
  const actions = useCategoryActions()
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const saving = actions.create.isPending || actions.update.isPending

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = name.trim()
    if (value.length < 2) return setError(t('categoriesPage.form.nameRequired'))
    if (existing.some((c) => c.id !== category?.id && c.name.trim().toLowerCase() === value.toLowerCase())) return setError(t('categoriesPage.form.duplicate'))
    const done = {
      onSuccess: () => {
        toast.success(category ? t('categoriesPage.form.updated', { name: value }) : t('categoriesPage.form.created', { name: value }))
        onClose()
      },
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    }
    const input = { name: value, description: description.trim() || undefined }
    if (category) actions.update.mutate({ id: category.id, ...input }, done)
    else actions.create.mutate(input, done)
  }

  return (
    <ResponsivePanel
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={category ? t('categoriesPage.form.editTitle') : t('categoriesPage.new')}
      footer={
        <>
          <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>{t('reservationsPage.form.cancel')}</Button>
          <Button type="submit" form="category-form" className="h-11" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />} {t('tablesPage.form.save')}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pt-1">
        <div className="grid gap-2">
          <Label htmlFor="cat-name">{t('categoriesPage.form.name')}</Label>
          <Input id="cat-name" value={name} maxLength={100} autoFocus onChange={(e) => { setName(e.target.value); setError(null) }} placeholder={t('categoriesPage.form.namePlaceholder')} aria-invalid={!!error} />
          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cat-desc">{t('categoriesPage.form.description')}</Label>
          <Textarea id="cat-desc" rows={2} maxLength={300} className="resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </form>
    </ResponsivePanel>
  )
}

export default function CategoriesPage() {
  const { t } = useTranslation()
  const [view, setView] = useState<'active' | 'trash'>('active')
  const categories = useCategoriesQuery()
  const trash = useCategoriesTrash(view === 'trash')
  const products = useProductsQuery()
  const actions = useCategoryActions()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const q = view === 'trash' ? trash : categories
  const count = (id: string) => (products.data ?? []).filter((p) => p.category_id === id && !p.is_combo).length

  async function remove(c: Category) {
    const n = count(c.id)
    const ok = await confirm({
      title: t('categoriesPage.deleteTitle', { name: c.name }),
      description: n ? t('categoriesPage.deleteWithProducts', { count: n }) : t('categoriesPage.deleteText'),
      confirmText: t('productsPage.delete'),
      tone: 'danger',
    })
    if (!ok) return
    actions.remove.mutate(c.id, { onSuccess: () => toast.success(t('categoriesPage.deleted', { name: c.name })), onError: (e) => toast.error(getErrorMessage(e)) })
  }

  return (
    <Page width="narrow">
      <PageHeader
        title={t('categoriesPage.title')}
        description={t('categoriesPage.subtitle')}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/products"><ArrowLeft /> <span className="max-sm:sr-only">{t('nav.products')}</span></Link>
            </Button>
            {view === 'active' && <Button onClick={() => setEditing('new')}><Plus /> <span className="max-[380px]:sr-only">{t('categoriesPage.new')}</span></Button>}
          </>
        }
      />
      <FilterChips
        label={t('categoriesPage.title')}
        value={view}
        onChange={setView}
        options={[
          { value: 'active', label: t('categoriesPage.active'), count: categories.data?.length },
          { value: 'trash', label: t('productsPage.trash') },
        ]}
      />
      <Panel flush>
        {q.isLoading ? (
          <ul className="divide-y">{[0, 1, 2, 3].map((i) => <li key={i} className="px-5 py-4"><Skeleton className="h-5 w-48" /></li>)}</ul>
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : !q.data?.length ? (
          <EmptyState icon={Layers} title={view === 'trash' ? t('productsPage.emptyTrash') : t('categoriesPage.empty')} description={view === 'active' ? t('categoriesPage.emptyHint') : undefined} />
        ) : (
          <ul className="stagger-in divide-y">
            {q.data.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{c.description || t('categoriesPage.products', { count: count(c.id) })}</p>
                </div>
                {view === 'trash' ? (
                  <Button size="sm" variant="outline" onClick={() => actions.restore.mutate(c.id, { onSuccess: () => toast.success(t('categoriesPage.restored', { name: c.name })), onError: (e) => toast.error(getErrorMessage(e)) })}>
                    <ArchiveRestore /> {t('productsPage.restore')}
                  </Button>
                ) : (
                  <>
                    <span className="hidden text-[13px] text-muted-foreground tabular-nums sm:inline">{t('categoriesPage.products', { count: count(c.id) })}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9" aria-label={t('inventoryPage.actions', { name: c.name })}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => setEditing(c)}><Pencil /> {t('inventoryPage.edit')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => void remove(c)}><Trash2 /> {t('productsPage.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {editing && <CategoryForm category={editing === 'new' ? null : editing} existing={categories.data ?? []} onClose={() => setEditing(null)} />}
    </Page>
  )
}
