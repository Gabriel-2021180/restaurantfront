import type { Column, ColumnType, ReportData, Row } from './data'

/**
 * Exportación a Excel (exceljs) y PDF (jspdf). Las librerías se cargan solo al exportar:
 * pesan bastante y la mayoría de las pantallas nunca las necesita.
 */
export interface ExportMeta {
  business: string
  period: string
  generatedBy: string
  fileName: string
}

const TZ = 'America/La_Paz'
const LA_PAZ_OFFSET_MS = -4 * 60 * 60_000

const money = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const decimal = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 3 })
const int = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 })

function formatCell(value: Row[string], type: ColumnType = 'text'): string {
  if (value === null || value === undefined || value === '') return ''
  switch (type) {
    case 'money':
      return `Bs ${money.format(Number(value))}`
    case 'int':
      return int.format(Number(value))
    case 'decimal':
      return decimal.format(Number(value))
    case 'percent':
      return `${money.format(Number(value) * 100)}%`
    case 'datetime':
      return new Date(String(value)).toLocaleString('es-BO', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    case 'date':
      return new Date(String(value)).toLocaleDateString('es-BO', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
    default:
      return String(value)
  }
}

const totalsOf = (rows: Row[], keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)]))

const generatedAt = () => new Date().toLocaleString('es-BO', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' })

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/* ---------------------------------- Excel --------------------------------- */

const EXCEL_FMT: Partial<Record<ColumnType, string>> = {
  money: '"Bs" #,##0.00',
  int: '#,##0',
  decimal: '#,##0.###',
  percent: '0.00%',
  datetime: 'dd/mm/yyyy hh:mm',
  date: 'dd/mm/yyyy',
}

/** Excel no guarda zona horaria: se escribe la hora de pared de La Paz. */
const excelValue = (value: Row[string], type: ColumnType = 'text') => {
  if (value === null || value === undefined || value === '') return null
  if (type === 'datetime' || type === 'date') return new Date(new Date(String(value)).getTime() + LA_PAZ_OFFSET_MS)
  if (type === 'text') return String(value)
  return Number(value)
}

/** Nombre de hoja válido: máx. 31 caracteres, sin : \ / ? * [ ] y sin repetir. */
function sheetName(title: string, used: Set<string>) {
  const base = title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 28).trim() || 'Hoja'
  let name = base
  for (let i = 2; used.has(name); i++) name = `${base.slice(0, 26)} ${i}`
  used.add(name)
  return name
}

export async function exportExcel(reports: ReportData[], meta: ExportMeta) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = meta.generatedBy
  wb.created = new Date()
  const used = new Set<string>()
  const ink = 'FF2A2420'
  const soft = 'FFF1EEEA'

  for (const report of reports) {
    // Hoja de resumen por informe: encabezado y cifras clave.
    if (report.summary?.length || reports.length > 1) {
      const ws = wb.addWorksheet(sheetName(report.title, used))
      ws.columns = [{ width: 34 }, { width: 22 }]
      ws.addRow([meta.business]).font = { bold: true, size: 14 }
      ws.addRow([report.title]).font = { bold: true, size: 12 }
      ws.addRow([`Periodo: ${meta.period}`])
      ws.addRow([`Generado: ${generatedAt()} por ${meta.generatedBy}`]).font = { color: { argb: 'FF6B625B' } }
      ws.addRow([])
      for (const s of report.summary ?? []) {
        const row = ws.addRow([s.label, excelValue(s.value, s.type)])
        row.getCell(1).font = { bold: true }
        if (s.type && EXCEL_FMT[s.type]) row.getCell(2).numFmt = EXCEL_FMT[s.type]!
      }
    }

    for (const table of report.tables) {
      const ws = wb.addWorksheet(sheetName(table.title, used), { views: [{ state: 'frozen', ySplit: table.note ? 4 : 3 }] })
      ws.columns = table.columns.map((c) => ({ key: c.key, width: c.width ?? 16 }))
      ws.addRow([`${table.title} · ${meta.business}`]).font = { bold: true, size: 12 }
      ws.addRow([`Periodo: ${meta.period}`]).font = { color: { argb: 'FF6B625B' } }
      if (table.note) ws.addRow([table.note]).font = { italic: true, color: { argb: 'FF6B625B' } }

      const header = ws.addRow(table.columns.map((c) => c.label))
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ink } }
        cell.alignment = { vertical: 'middle', wrapText: true }
      })
      header.height = 20
      const headerRow = header.number

      for (const r of table.rows) {
        const row = ws.addRow(table.columns.map((c) => excelValue(r[c.key], c.type)))
        table.columns.forEach((c, i) => {
          if (c.type && EXCEL_FMT[c.type]) row.getCell(i + 1).numFmt = EXCEL_FMT[c.type]!
        })
      }
      if (table.rows.length) ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow + table.rows.length, column: table.columns.length } }

      if (table.totals?.length && table.rows.length) {
        // Fórmulas reales: quien valide el archivo ve de dónde sale cada total.
        const first = headerRow + 1
        const last = headerRow + table.rows.length
        const values = table.columns.map((c, i) => {
          if (i === 0) return 'Total'
          if (!table.totals!.includes(c.key)) return null
          const col = ws.getColumn(i + 1).letter
          return { formula: `SUBTOTAL(9,${col}${first}:${col}${last})`, result: totalsOf(table.rows, [c.key])[c.key] }
        })
        const total = ws.addRow(values)
        total.font = { bold: true }
        total.eachCell((cell, i) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: soft } }
          const type = table.columns[i - 1]?.type
          if (type && EXCEL_FMT[type]) cell.numFmt = EXCEL_FMT[type]!
        })
      }
      if (!table.rows.length) ws.addRow(['Sin datos en este periodo']).font = { italic: true }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${meta.fileName}.xlsx`)
}

/* ----------------------------------- PDF ---------------------------------- */

export async function exportPdf(reports: ReportData[], meta: ExportMeta) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const wide = reports.some((r) => r.tables.some((t) => t.columns.length > 6))
  const doc = new jsPDF({ orientation: wide ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const ink: [number, number, number] = [42, 36, 32]
  const muted: [number, number, number] = [107, 98, 91]
  let y = margin

  const ensure = (space: number) => {
    if (y + space > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  reports.forEach((report, ri) => {
    if (ri > 0) {
      doc.addPage()
      y = margin
    }
    doc.setTextColor(...ink).setFont('helvetica', 'bold').setFontSize(16).text(meta.business, margin, y)
    y += 20
    doc.setFontSize(13).text(report.title, margin, y)
    y += 16
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...muted)
    doc.text(`Periodo: ${meta.period}   ·   Generado: ${generatedAt()} por ${meta.generatedBy}`, margin, y)
    y += 18

    if (report.summary?.length) {
      // Cifras clave en filas de dos columnas.
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3, textColor: ink },
        columnStyles: { 0: { cellWidth: 180, textColor: muted }, 1: { fontStyle: 'bold' } },
        body: report.summary.map((s) => [s.label, formatCell(s.value, s.type)]),
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14
    }

    for (const table of report.tables) {
      ensure(60)
      doc.setTextColor(...ink).setFont('helvetica', 'bold').setFontSize(11).text(table.title, margin, y)
      y += 6
      if (table.note) {
        y += 10
        doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted).text(table.note, margin, y)
      }
      const totals = table.totals?.length && table.rows.length ? totalsOf(table.rows, table.totals) : null
      const numeric = (c: Column) => c.type && c.type !== 'text' && c.type !== 'datetime' && c.type !== 'date'
      autoTable(doc, {
        startY: y + 6,
        margin: { left: margin, right: margin },
        head: [table.columns.map((c) => c.label)],
        body: table.rows.length ? table.rows.map((r) => table.columns.map((c) => formatCell(r[c.key], c.type))) : [[{ content: 'Sin datos en este periodo', colSpan: table.columns.length, styles: { fontStyle: 'italic', textColor: muted } }]],
        foot: totals ? [table.columns.map((c, i) => (i === 0 ? 'Total' : table.totals!.includes(c.key) ? formatCell(totals[c.key], c.type) : ''))] : undefined,
        showFoot: 'lastPage',
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 4, lineColor: [226, 221, 216], lineWidth: 0.5, textColor: ink, overflow: 'linebreak' },
        headStyles: { fillColor: ink, textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [241, 238, 234], textColor: ink, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 248, 246] },
        columnStyles: Object.fromEntries(table.columns.map((c, i) => [i, numeric(c) ? { halign: 'right' as const } : {}])),
        // Encabezado y total alineados como sus valores.
        didParseCell: (cell) => {
          if (cell.section !== 'body' && numeric(table.columns[cell.column.index])) cell.cell.styles.halign = 'right'
        },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22
    }
  })

  // Pie con número de página en todas las hojas.
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted)
    doc.text(`${meta.business} · ${meta.period}`, margin, doc.internal.pageSize.getHeight() - 20)
    doc.text(`Página ${i} de ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' })
  }
  doc.save(`${meta.fileName}.pdf`)
}
