import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ImageUp, LoaderCircle, QrCode, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { confirm } from '@/components/feedback/confirm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import api, { getErrorMessage } from '@/lib/api/client'

const KEY = ['finance', 'qr'] as const
const MAX_MB = 2

/** QR del banco del restaurante: el cajero lo muestra al cobrar por QR. Se guarda al instante, aparte del formulario. */
export function QrUploadCard() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ qr_static_url: string | null }>('/finance/qr')).data })
  const url = data?.qr_static_url

  async function send(form: FormData, okText: string) {
    setBusy(true)
    try {
      const res = (await api.put<{ qr_static_url: string | null }>('/finance/config/qr', form)).data
      qc.setQueryData(KEY, res)
      toast.success(okText)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function onFile(file?: File) {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return void toast.error(t('settings.payments.badType'))
    if (file.size > MAX_MB * 1024 * 1024) return void toast.error(t('settings.identity.tooBig', { mb: MAX_MB }))
    const form = new FormData()
    form.append('qr', file)
    void send(form, t('settings.payments.saved'))
  }

  async function remove() {
    const ok = await confirm({
      title: t('settings.payments.removeTitle'),
      description: t('settings.payments.removeDescription'),
      confirmText: t('settings.identity.remove'),
      tone: 'danger',
    })
    if (!ok) return
    const form = new FormData()
    form.append('remove_qr', 'true')
    void send(form, t('settings.payments.removed'))
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative grid size-36 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
        {isLoading ? (
          <Skeleton className="size-full rounded-none" />
        ) : url ? (
          <img src={url} alt={t('settings.payments.alt')} className="size-full object-contain p-2" />
        ) : (
          <QrCode className="size-10 text-[#736a63]" />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/70">
            <LoaderCircle className="size-6 animate-spin text-[#736a63]" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="font-medium">{url ? t('settings.payments.ready') : t('settings.payments.empty')}</p>
          <p className="mt-1 max-w-[56ch] text-[13px] text-muted-foreground">{t('settings.payments.hint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            <ImageUp /> {url ? t('settings.payments.change') : t('settings.payments.upload')}
          </Button>
          {url && (
            <Button type="button" variant="ghost" onClick={remove} disabled={busy}>
              <Trash2 /> {t('settings.identity.remove')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
