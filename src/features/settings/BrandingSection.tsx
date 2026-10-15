import { useEffect, useId, useMemo, useRef, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ImageUp, LayoutGrid, Pipette, Receipt, Trash2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_LOGO } from '@/app/providers/BrandingProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildBrandPalette } from '@/lib/color'
import { cn } from '@/lib/utils'

export const DEFAULT_ACCENT = '#9A5B43'
const MAX_BYTES = 2 * 1024 * 1024
const IMAGE_TYPES = /^image\/(png|jpe?g|webp|svg\+xml)$/

/** Acentos sugeridos: tonos apagados que acompañan sin gritar, con contraste AA en ambos temas. */
const SWATCHES = [
  { hex: '#9A5B43', key: 'terracotta' },
  { hex: '#7E4453', key: 'wine' },
  { hex: '#6E4E3E', key: 'cocoa' },
  { hex: '#8A7444', key: 'ochre' },
  { hex: '#66704A', key: 'olive' },
  { hex: '#4F6B5C', key: 'green' },
  { hex: '#3F6468', key: 'teal' },
  { hex: '#4F5873', key: 'slate' },
] as const

export interface BrandDraft {
  name: string
  accent: string
  logoUrl: string | null
  faviconUrl: string | null
}

interface Props {
  draft: BrandDraft
  onName: (v: string) => void
  onAccent: (v: string) => void
  onLogo: (file: File | null) => void
  onFavicon: (file: File | null) => void
}

/** Valida tipo y peso antes de aceptar un archivo; avisa con un toast si no sirve. */
function pickImage(file: File | undefined, t: (k: string, o?: Record<string, unknown>) => string): File | null {
  if (!file) return null
  if (!IMAGE_TYPES.test(file.type)) {
    toast.error(t('settings.identity.badType'))
    return null
  }
  if (file.size > MAX_BYTES) {
    toast.error(t('settings.identity.tooBig', { mb: 2 }))
    return null
  }
  return file
}

function ImageSlot({
  label,
  hint,
  url,
  fallback,
  square,
  onPick,
  onClear,
}: {
  label: string
  hint: string
  url: string | null
  fallback: string
  square?: boolean
  onPick: (f: File | null) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-describedby={`${id}-hint`}
        className={cn(
          'group relative grid shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border bg-background transition-[border-color,transform] duration-150 ease-out hover:border-primary active:scale-[0.97]',
          square ? 'size-16' : 'h-16 w-24',
        )}
      >
        <img src={url ?? fallback} alt="" className={cn('size-full object-contain p-2', !url && 'opacity-50 grayscale')} />
        <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          <ImageUp className="size-5" />
        </span>
        <span className="sr-only">{url ? t('settings.identity.change') : t('settings.identity.upload')} {label}</span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p id={`${id}-hint`} className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              onPick(pickImage(e.target.files?.[0], t))
              e.target.value = ''
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
            <ImageUp /> {url ? t('settings.identity.change') : t('settings.identity.upload')}
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              <Trash2 /> {t('settings.identity.remove')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Mini panel con el color ya ajustado a contraste, tal como lo verá el personal. */
function Preview({ draft, dark }: { draft: BrandDraft; dark?: boolean }) {
  const { t } = useTranslation()
  const palette = buildBrandPalette(draft.accent)
  // El color de marca solo tiñe selección e hilo; los botones quedan en tinta.
  const brand = dark ? palette?.brandDark : palette?.brand
  const style = brand ? ({ '--brand': brand, '--brand-dark': brand, '--primary-soft': `color-mix(in oklab, ${brand} ${dark ? 14 : 10}%, transparent)` } as CSSProperties) : undefined
  const items = [
    { icon: LayoutGrid, label: t('settings.identity.previewTables'), active: true },
    { icon: UtensilsCrossed, label: t('settings.identity.previewKitchen') },
    { icon: Receipt, label: t('settings.identity.previewCashier') },
  ]
  return (
    <figure className={cn(dark ? 'dark' : 'light', 'overflow-hidden rounded-xl border bg-background text-foreground')} style={style}>
      <div className="aguayo-thread" />
      <div className="flex">
        <div className="flex w-[46%] flex-col gap-1 border-r p-2.5">
          <div className="mb-1.5 flex min-w-0 items-center gap-2">
            <img src={draft.logoUrl ?? DEFAULT_LOGO} alt="" className="size-6 shrink-0 rounded-md object-contain" />
            <span className="truncate font-display text-[13px] font-semibold">{draft.name.trim() || 'Resto Admin'}</span>
          </div>
          {items.map(({ icon: Icon, label, active }) => (
            <span
              key={label}
              className={cn('flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px]', active ? 'bg-primary-soft font-medium text-foreground' : 'text-muted-foreground')}
            >
              <Icon className="size-3" /> {label}
            </span>
          ))}
        </div>
        <div className="flex flex-1 flex-col justify-between gap-3 p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('h-7 rounded-md border bg-card', i === 1 && 'border-[var(--brand)] bg-primary-soft')} />
            ))}
          </div>
          <span className="self-end rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">{t('settings.identity.previewAction')}</span>
        </div>
      </div>
      <figcaption className="sr-only">{dark ? t('settings.identity.previewDark') : t('settings.identity.previewLight')}</figcaption>
    </figure>
  )
}

export function BrandingSection({ draft, onName, onAccent, onLogo, onFavicon }: Props) {
  const { t } = useTranslation()
  const custom = useMemo(() => !SWATCHES.some((s) => s.hex.toLowerCase() === draft.accent.toLowerCase()), [draft.accent])
  const colorRef = useRef<HTMLInputElement>(null)

  // Libera las URLs temporales de las imágenes elegidas y aún no guardadas.
  useEffect(() => {
    const urls = [draft.logoUrl, draft.faviconUrl].filter((u): u is string => !!u?.startsWith('blob:'))
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [draft.logoUrl, draft.faviconUrl])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="brand-name">{t('settings.identity.name')}</Label>
          <Input id="brand-name" value={draft.name} maxLength={150} onChange={(e) => onName(e.target.value)} placeholder={t('settings.identity.namePlaceholder')} />
          <p className="text-[13px] text-muted-foreground">{t('settings.identity.nameHint')}</p>
        </div>

        <div className="grid gap-5">
          <ImageSlot
            label={t('settings.identity.logo')}
            hint={t('settings.identity.logoHint')}
            url={draft.logoUrl}
            fallback={DEFAULT_LOGO}
            onPick={(f) => f && onLogo(f)}
            onClear={() => onLogo(null)}
          />
          <ImageSlot
            square
            label={t('settings.identity.favicon')}
            hint={t('settings.identity.faviconHint')}
            url={draft.faviconUrl}
            fallback={draft.logoUrl ?? DEFAULT_LOGO}
            onPick={(f) => f && onFavicon(f)}
            onClear={() => onFavicon(null)}
          />
        </div>

        <fieldset className="grid gap-3">
          <legend className="mb-3 text-sm font-medium">{t('settings.identity.accent')}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((s) => {
              const selected = s.hex.toLowerCase() === draft.accent.toLowerCase()
              return (
                <button
                  key={s.hex}
                  type="button"
                  onClick={() => onAccent(s.hex)}
                  aria-pressed={selected}
                  title={t(`settings.identity.swatch.${s.key}`)}
                  className={cn(
                    'grid size-9 cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform duration-150 ease-out active:scale-90',
                    selected && 'ring-2 ring-foreground',
                  )}
                  style={{ background: s.hex }}
                >
                  {selected && <Check className="size-4 text-white" strokeWidth={3} />}
                  <span className="sr-only">{t(`settings.identity.swatch.${s.key}`)}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => colorRef.current?.click()}
              aria-pressed={custom}
              className={cn(
                'relative grid size-9 cursor-pointer place-items-center rounded-full border bg-card ring-offset-2 ring-offset-card transition-transform duration-150 ease-out active:scale-90',
                custom && 'ring-2 ring-foreground',
              )}
              style={custom ? { background: draft.accent } : undefined}
            >
              <Pipette className={cn('size-4', custom ? 'text-white' : 'text-muted-foreground')} />
              <span className="sr-only">{t('settings.identity.custom')}</span>
            </button>
            <input ref={colorRef} type="color" value={draft.accent} onChange={(e) => onAccent(e.target.value.toUpperCase())} className="sr-only" tabIndex={-1} aria-hidden />
          </div>
          <p className="text-[13px] text-muted-foreground">{t('settings.identity.accentHint')}</p>
        </fieldset>
      </div>

      <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Preview draft={draft} />
        <Preview draft={draft} dark />
        <p className="text-[13px] text-muted-foreground sm:col-span-2 lg:col-span-1">{t('settings.identity.previewHint')}</p>
      </div>
    </div>
  )
}
