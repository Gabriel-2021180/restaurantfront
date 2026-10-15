import api from '@/lib/api/client'

export interface InviteInfo {
  role_name?: string
  [key: string]: unknown
}

export interface RegisterPayload {
  invite_code: string
  email: string
  email_code: string
  first_names: string
  last_names: string
  ci: string
  phone: string
  address: string
  password: string
}

export const authApi = {
  validateInvite: async (code: string) => (await api.get<InviteInfo>(`/users/invites/validate/${encodeURIComponent(code)}`)).data,
  requestEmailCode: async (email: string) => (await api.post('/users/request-verification', { email })).data,
  register: async (payload: RegisterPayload) => (await api.post('/users/register', payload)).data,
  recoveryInit: async (email: string) =>
    (await api.post<{ required_security_question?: boolean; question?: string }>('/auth/forgot-password/init', { email })).data,
  recoveryVerify: async (email: string, answer: string) => (await api.post('/auth/forgot-password/verify', { email, answer })).data,
  recoveryReset: async (email: string, code: string, newPassword: string) =>
    (await api.post('/auth/forgot-password/reset', { email, code, new_password: newPassword })).data,
}
