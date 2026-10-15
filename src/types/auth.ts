export type SystemRole = 'super-admin' | 'admin' | 'cashier' | 'waiter' | 'chef' | 'guest'

export interface Role {
  id?: string
  name?: string
  slug?: string
}

export interface User {
  id: string
  email: string
  first_names?: string
  last_names?: string
  name?: string
  ci?: string
  phone?: string
  address?: string
  role?: Role | string | null
  is_banned?: boolean
  security_question?: string | null
  /** La contraseña la puso el sistema o un admin: hay que cambiarla antes de usar el panel. */
  is_password_temporary?: boolean
  created_at?: string
  [key: string]: unknown
}

export interface LoginResponse {
  access_token: string
  user: User
}
