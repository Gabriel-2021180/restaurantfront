/** Shape de error de NestJS: message puede ser string o lista (ValidationPipe). */
export interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  /** Código de máquina opcional (p. ej. ACCOUNT_LOCKED, CASH_REGISTER_CLOSED). */
  error?: string
}

export interface Paginated<T> {
  data: T[]
  meta: { page: number; total: number; last_page: number }
}
