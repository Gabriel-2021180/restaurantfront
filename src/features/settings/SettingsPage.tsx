import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Boxes, Clock, LoaderCircle, Palette, QrCode, ReceiptText, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { QrUploadCard } from './QrUploadCard'
import { BrandingSection, DEFAULT_ACCENT, type BrandDraft } from './BrandingSection'
import { useBrandingSettings, useFinanceConfig, useUpdateBranding, useUpdateFinanceConfig, type FinanceConfig } from './api'
import { TimePicker } from '@/components/forms/DatePicker'

const SECTIONS = [
  { id: 'identity', icon: Palette },
  { id: 'invoice', icon: ReceiptText },
  { id: 'payments', icon: QrCode },
  { id: 'automation', icon: Clock },
  { id: 'inventory', icon: Boxes },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

interface ImageChange {
  file: File | null
  preview: string | null
  removed: boolean
}
const NO_CHANGE: ImageChange = { file: null, preview: null, removed: false }

function Section({ id, title, description, children }: { id: SectionId; title: string; description: string; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className="scroll-mt-36 border-b py-8 lg:scroll-mt-24 first:pt-0 last:border-b-0">
      <h2 id={`settings-${id}-title`} className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 mb-6 max-w-[62ch] text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  )
}

function Field({ id, label, hint, error, className, children }: { id: string; label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('grid content-start gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-[13px] text-destructive">{error}</p> : hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Resalta en el índice la sección que está a la vista. */
function useActiveSection() {
  const [active, setActive] = useState<SectionId>('identity')
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`settings-${s.id}`)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id.replace('settings-', '') as SectionId)
      },
      { rootMargin: '-20% 0px -60% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
  return [active, setActive] as const
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[12rem_1fr]">
        <div className="hidden flex-col gap-2 lg:flex">
          {SECTIONS.map((s) => <Skeleton key={s.id} className="h-9 w-full" />)}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-11 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const config = useFinanceConfig()
  const branding = useBrandingSettings()
  const saveConfig = useUpdateFinanceConfig()
  const saveBranding = useUpdateBranding()
  const [active, setActive] = useActiveSection()

  const form = useForm<FinanceConfig>({ values: config.data, resetOptions: { keepDirtyValues: true } })
  const { register, control, formState, reset, handleSubmit } = form
  const autoClose = useWatch({ control, name: 'enable_auto_close' })
  const blockSupply = useWatch({ control, name: 'block_sale_on_low_supply' })

  const savedName = branding.data?.name ?? ''
  const savedAccent = (branding.data?.accent_color ?? DEFAULT_ACCENT).toUpperCase()
  const [brandName, setBrandName] = useState<string | null>(null)
  const [accent, setAccent] = useState<string | null>(null)
  const [logo, setLogo] = useState<ImageChange>(NO_CHANGE)
  const [favicon, setFavicon] = useState<ImageChange>(NO_CHANGE)

  const draft: BrandDraft = {
    name: brandName ?? savedName,
    accent: accent ?? savedAccent,
    logoUrl: logo.removed ? null : (logo.preview ?? branding.data?.logo_url ?? null),
    faviconUrl: favicon.removed ? null : (favicon.preview ?? branding.data?.favicon_url ?? null),
  }

  const brandingDirty =
    (brandName !== null && brandName.trim() !== savedName.trim()) ||
    (accent !== null && accent.toUpperCase() !== savedAccent) ||
    !!logo.file || logo.removed || !!favicon.file || favicon.removed
  const configDirty = formState.isDirty
  const dirty = brandingDirty || configDirty
  const saving = saveConfig.isPending || saveBranding.isPending

  // Avisar antes de cerrar o recargar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const imageChange = (set: (c: ImageChange) => void) => (file: File | null) =>
    set(file ? { file, preview: URL.createObjectURL(file), removed: false } : { file: null, preview: null, removed: true })

  function discardBranding() {
    setBrandName(null)
    setAccent(null)
    setLogo(NO_CHANGE)
    setFavicon(NO_CHANGE)
  }

  function discard() {
    discardBranding()
    reset(config.data)
  }

  const onSubmit = handleSubmit(async (values) => {
    const jobs: Promise<unknown>[] = []
    if (configDirty) {
      jobs.push(saveConfig.mutateAsync(values).then((data) => reset(data)))
    }
    if (brandingDirty) {
      jobs.push(
        saveBranding
          .mutateAsync({
            name: draft.name,
            accent_color: draft.accent,
            logo: logo.file,
            favicon: favicon.file,
            remove_logo: logo.removed,
            remove_favicon: favicon.removed,
          })
          .then(discardBranding),
      )
    }
    const results = await Promise.allSettled(jobs)
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) toast.error(getErrorMessage(failed.reason, t('settings.saveError')))
    else toast.success(t('settings.saved'))
  })

  const nav = useMemo(() => SECTIONS.map((s) => ({ ...s, label: t(`settings.nav.${s.id}`) })), [t])

  if (config.isLoading || branding.isLoading) return <SettingsSkeleton />

  if (config.isError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="size-8 text-warning" />
        <p className="font-semibold">{t('settings.loadError')}</p>
        <p className="text-sm text-muted-foreground">{getErrorMessage(config.error)}</p>
        <Button variant="outline" onClick={() => void config.refetch()}>
          <RotateCcw /> {t('common.retry', 'Reintentar')}
        </Button>
      </div>
    )
  }

  const go = (id: SectionId) => {
    setActive(id)
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-24">
      <header>
        <h1 className="text-[28px] leading-tight font-semibold">{t('settings.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('settings.subtitle')}</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label={t('settings.title')} className="sticky top-[calc(2px+3.5rem)] z-10 -mx-4 mb-6 border-b bg-background/95 px-4 backdrop-blur-sm md:top-[calc(2px+4rem)] lg:top-20 lg:mx-0 lg:mb-0 lg:self-start lg:border-b-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <ul className="flex gap-1 overflow-x-auto py-2 lg:flex-col lg:py-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map(({ id, icon: Icon, label }) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active === id ? 'true' : undefined}
                  className={cn(
                    'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground',
                    active === id && 'bg-primary-soft font-medium text-primary hover:bg-primary-soft hover:text-primary',
                  )}
                >
                  <Icon className="size-4" /> {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <form id="settings-form" onSubmit={onSubmit} noValidate className="min-w-0 rounded-xl border bg-card px-5 py-8 md:px-8">
          <Section id="identity" title={t('settings.nav.identity')} description={t('settings.identity.description')}>
            {branding.isError ? (
              <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">{t('settings.identity.unavailable')}</p>
            ) : (
              <BrandingSection
                draft={draft}
                onName={setBrandName}
                onAccent={setAccent}
                onLogo={imageChange(setLogo)}
                onFavicon={imageChange(setFavicon)}
              />
            )}
          </Section>

          <Section id="invoice" title={t('settings.nav.invoice')} description={t('settings.invoice.description')}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="cfg-name" label={t('settings.invoice.name')} error={formState.errors.name?.message} className="sm:col-span-2">
                <Input id="cfg-name" autoComplete="organization" {...register('name', { required: t('settings.required') })} aria-invalid={!!formState.errors.name} />
              </Field>
              <Field id="cfg-nit" label={t('settings.invoice.nit')} error={formState.errors.nit?.message}>
                <Input
                  id="cfg-nit"
                  inputMode="numeric"
                  {...register('nit', { required: t('settings.required'), pattern: { value: /^\d{5,15}$/, message: t('settings.invoice.nitInvalid') } })}
                  aria-invalid={!!formState.errors.nit}
                />
              </Field>
              <Field id="cfg-phone" label={t('settings.invoice.phone')}>
                <Input id="cfg-phone" type="tel" inputMode="tel" autoComplete="tel" {...register('phone')} />
              </Field>
              <Field id="cfg-address" label={t('settings.invoice.address')} className="sm:col-span-2">
                <Input id="cfg-address" autoComplete="street-address" {...register('address')} />
              </Field>
              <Field id="cfg-legend" label={t('settings.invoice.legend')} hint={t('settings.invoice.legendHint')} className="sm:col-span-2">
                <Textarea id="cfg-legend" rows={3} className="resize-none" {...register('legend_law')} />
              </Field>
            </div>
          </Section>

          <Section id="payments" title={t('settings.nav.payments')} description={t('settings.payments.description')}>
            <QrUploadCard />
          </Section>

          <Section id="automation" title={t('settings.nav.automation')} description={t('settings.automation.description')}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <Controller
                  control={control}
                  name="enable_auto_close"
                  render={({ field }) => <Switch id="cfg-autoclose" className="mt-0.5" checked={!!field.value} onCheckedChange={field.onChange} />}
                />
                <div>
                  <Label htmlFor="cfg-autoclose" className="cursor-pointer">{t('settings.automation.toggle')}</Label>
                  <p className="mt-1 max-w-[52ch] text-[13px] text-muted-foreground">{t('settings.automation.toggleHint')}</p>
                </div>
              </div>
              <div className={cn('grid gap-2 transition-opacity duration-200 sm:w-40', !autoClose && 'pointer-events-none opacity-45')} aria-disabled={!autoClose}>
                <Label htmlFor="cfg-time">{t('settings.automation.time')}</Label>
                <Controller control={control} name="auto_close_time" render={({ field }) => <TimePicker id="cfg-time" step={30} disabled={!autoClose} value={String(field.value ?? '').slice(0, 5)} onChange={field.onChange} />} />
              </div>
            </div>
          </Section>

          <Section id="inventory" title={t('settings.nav.inventory')} description={t('settings.inventory.description')}>
            <div className="flex items-start gap-3">
              <Controller
                control={control}
                name="block_sale_on_low_supply"
                render={({ field }) => <Switch id="cfg-block" className="mt-0.5" checked={!!field.value} onCheckedChange={field.onChange} />}
              />
              <div>
                <Label htmlFor="cfg-block" className="cursor-pointer">{t('financeSettings.blockSupplyTitle')}</Label>
                <p className="mt-1 max-w-[62ch] text-[13px] text-muted-foreground">{blockSupply ? t('financeSettings.blockSupplyOn') : t('financeSettings.blockSupplyOff')}</p>
              </div>
            </div>
          </Section>
        </form>
      </div>

      <div
        role="region"
        aria-label={t('settings.unsaved')}
        aria-hidden={!dirty}
        inert={!dirty}
        className={cn(
          'fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 transition-[opacity,transform] duration-200 ease-out md:bottom-6',
          dirty ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <div className="flex w-full max-w-xl items-center gap-3 rounded-xl border bg-popover py-2.5 pr-2.5 pl-4 shadow-[0_8px_30px_-8px_rgb(0_0_0/0.25)]">
          <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{t('settings.unsaved')}</p>
          <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={saving}>
            {t('settings.discard')}
          </Button>
          <Button type="submit" form="settings-form" size="sm" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin" />} {t('settings.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
