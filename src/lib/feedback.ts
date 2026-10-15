/** Sonido corto y vibración para avisos en vivo (sin archivos externos). */
let ctx: AudioContext | null = null

export function playChime() {
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    }
  } catch {
    /* el navegador bloqueó el audio hasta la primera interacción */
  }
}

export function vibrate(pattern: number | number[] = [120, 60, 120]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}
