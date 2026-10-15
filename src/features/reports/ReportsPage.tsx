import { useState, type ComponentType } from 'react'
import { CalendarClock, FileSpreadsheet, History, FileText, LoaderCircle, Package, Receipt, ShieldCheck, Sparkles, UtensilsCrossed, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/app/providers/AuthProvider'
import { useBranding } from '@/app/providers/BrandingProvider'
import { DateRangePicker } from '@/components/forms/DateRangePicker'
import { Page, PageHeader } from '@/components/page'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/client'
import { presetRange, type DateRange } from '@/lib/date-range'
import { formatPlainDate } from '@/lib/format'
import { getDisplayName } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { REPORTS, type ReportId } from './data'

type Format = 'xlsx' | 'pdf'

interface ReportDef {
  id: ReportId
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  /** Solo el dueño (permiso de control de personal). */
  ownerOnly?: boolean
  /** No depende del rango de fechas. */
  snapshot?: boolean
}

const DEFS: ReportDef[] = [
  { id: 'sales', title: 'Ventas y facturación', description: 'Cada factura con cliente, NIT, método de pago y estado; totales por método y anuladas con su motivo.', icon: Receipt },
  { id: 'cash', title: 'Cierres de caja', description: 'Turnos con apertura, cierre, fondo inicial, efectivo contado, diferencias y arqueo por método.', icon: Wallet },
  { id: 'products', title: 'Productos y promociones', description: 'Unidades vendidas, ingresos y ganancia por producto; usos y descuento otorgado por promoción.', icon: UtensilsCrossed },
  { id: 'inventory', title: 'Inventario de insumos', description: 'Existencias actuales, mínimos, costo y valor del stock; insumos por reponer.', icon: Package, snapshot: true },
  { id: 'staff', title: 'Desempeño del personal', description: 'Mesas y ventas por mesero; facturas y cobros por cajero.', icon: ShieldCheck, ownerOnly: true },
  { id: 'audit', title: 'Registro de actividad', description: 'Quién creó, modificó, eliminó o anuló qué, con el detalle de cada cambio y su motivo.', icon: History, ownerOnly: true },
  { id: 'reservations', title: 'Reservas', description: 'Reservas del periodo con estado, mesa, personas y quién las registró.', icon: CalendarClock },
]

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Centro de informes: cada informe se descarga en Excel (para validar y cruzar datos) o PDF (para archivar o imprimir). */
export default function ReportsPage() {
  const { user, hasRole } = useAuth()
  const branding = useBranding()
  const [range, setRange] = useState<DateRange>(() => presetRange('month'))
  const [busy, setBusy] = useState<string | null>(null)
  const defs = DEFS.filter((d) => !d.ownerOnly || hasRole('super-admin'))

  const period = range.from === range.to ? formatPlainDate(range.from) : `${formatPlainDate(range.from)} al ${formatPlainDate(range.to)}`

  async function run(ids: ReportId[], format: Format, key: string, name: string) {
    if (busy) return
    setBusy(key)
    try {
      const data = await Promise.all(ids.map((id) => REPORTS[id](range)))
      const meta = {
        business: branding?.name || 'Restaurante',
        period,
        generatedBy: getDisplayName(user) || 'Usuario',
        fileName: `${slug(name)}_${range.from}_${range.to}`,
      }
      const { exportExcel, exportPdf } = await import('./export')
      await (format === 'xlsx' ? exportExcel(data, meta) : exportPdf(data, meta))
      toast.success(`${name}: ${format === 'xlsx' ? 'Excel' : 'PDF'} descargado`)
    } catch (err) {
      toast.error('No se pudo generar el informe', { description: getErrorMessage(err) })
    } finally {
      setBusy(null)
    }
  }

  const ExportButtons = ({ ids, name, keyBase, primary }: { ids: ReportId[]; name: string; keyBase: string; primary?: boolean }) => (
    <div className="grid grid-cols-2 gap-2">
      {(['xlsx', 'pdf'] as const).map((f) => {
        const key = `${keyBase}-${f}`
        return (
          <Button
            key={f}
            variant={primary && f === 'xlsx' ? 'default' : 'outline'}
            className="h-10 min-w-0"
            disabled={busy !== null}
            onClick={() => void run(ids, f, key, name)}
            aria-label={`${name}: descargar ${f === 'xlsx' ? 'Excel' : 'PDF'}`}
          >
            {busy === key ? <LoaderCircle className="animate-spin" /> : f === 'xlsx' ? <FileSpreadsheet /> : <FileText />}
            {f === 'xlsx' ? 'Excel' : 'PDF'}
          </Button>
        )
      })}
    </div>
  )

  return (
    <Page>
      <PageHeader title="Informes" description="Descarga la información del periodo para revisarla, validarla o archivarla." />
      <DateRangePicker value={range} onChange={setRange} />

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-[var(--brand)]">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">Informe completo</h2>
            <p className="text-sm text-muted-foreground">Todos los informes en un solo archivo · {period}</p>
          </div>
        </div>
        <div className="sm:w-64">
          <ExportButtons ids={defs.map((d) => d.id)} name="Informe completo" keyBase="all" primary />
        </div>
      </section>

      <ul className="stagger-in grid gap-3 md:grid-cols-2">
        {defs.map((d) => (
          <li key={d.id} className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5')}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <d.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[17px] font-semibold">{d.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{d.description}</p>
                {d.snapshot && <p className="mt-1 text-[13px] text-muted-foreground">Muestra el estado actual; no usa el rango de fechas.</p>}
              </div>
            </div>
            <div className="mt-auto">
              <ExportButtons ids={[d.id]} name={d.title} keyBase={d.id} />
            </div>
          </li>
        ))}
      </ul>
    </Page>
  )
}
