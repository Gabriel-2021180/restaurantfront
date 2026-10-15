import type { AxiosInstance } from 'axios'
import { session } from '@/lib/session'
import { demoAdapter } from './adapter'

/** Activa la API simulada. Llamar solo en desarrollo. */
export function enableDemo(instance: AxiosInstance) {
  instance.defaults.adapter = demoAdapter
  session.configure(instance.defaults.baseURL ?? '/api/v1', demoAdapter)
  console.info('[demo] Modo demo activo: los datos son de ejemplo y viven en memoria.')
}
