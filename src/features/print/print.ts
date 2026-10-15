import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'

/**
 * Imprime un ticket sin depender de la pantalla actual.
 *
 * El ticket se monta en #print-root, hermano de #root. La hoja de impresión (index.css)
 * oculta todo lo demás del body con display:none, así no importan modales, transforms,
 * scroll ni el tema oscuro: al papel solo llega el ticket, con su alto real.
 */
let root: Root | null = null
let host: HTMLElement | null = null
let cleanupTimer: number | undefined

function cleanup() {
  window.clearTimeout(cleanupTimer)
  root?.unmount()
  root = null
  host?.remove()
  host = null
}

async function whenReady(el: HTMLElement) {
  const images = [...el.querySelectorAll('img')].filter((img) => !img.complete)
  await Promise.all([
    document.fonts?.ready,
    ...images.map((img) => new Promise((resolve) => { img.onload = img.onerror = resolve })),
  ])
  // Un cuadro más para que el navegador pinte el contenido recién montado.
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
}

export async function printTicket(ticket: ReactElement) {
  cleanup()
  host = document.createElement('div')
  host.id = 'print-root'
  document.body.appendChild(host)
  root = createRoot(host)
  flushSync(() => root!.render(ticket))
  await whenReady(host)

  // En PC print() bloquea hasta cerrar el diálogo; en celulares vuelve enseguida,
  // por eso se limpia en afterprint y, por si el navegador no lo emite, al minuto.
  window.addEventListener('afterprint', cleanup, { once: true })
  cleanupTimer = window.setTimeout(cleanup, 60_000)
  window.print()
}
