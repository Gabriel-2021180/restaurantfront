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
  created_at?: string
  [key: string]: unknown
}

export interface LoginResponse {
  access_token: string
  user: User
}
