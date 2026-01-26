import api from '../api/axios';

export default {
  // --- ADMIN ---
  getAllUsers: async () => {
    const { data } = await api.get('/users');
    return data;
  },
  
  getRoles: async () => {
    const { data } = await api.get('/roles');
    return data;
  },

  createUser: async (userData) => {
    const { data } = await api.post('/users', userData);
    return data;
  },

  createInvite: async (inviteData) => {
    const { data } = await api.post('/users/invites', inviteData);
    return data;
  },

  // --- PÚBLICO (NUEVO FLUJO DE REGISTRO) ---
  
  // Paso 1: Validar código de invitación del restaurante
  validateCode: async (code) => {
    const { data } = await api.get(`/users/invites/validate/${code}`);
    return data;
  },

  // Paso 2: Pedir código de verificación al correo (NUEVO)
  requestEmailVerification: async (email) => {
    const { data } = await api.post('/users/request-verification', { email });
    return data;
  },

  // Paso 3: Registro final con todos los datos
  register: async (registerData) => {
    const { data } = await api.post('/users/register', registerData);
    return data;
  },

  getTipsStats: async (period = 'day') => {
    const { data } = await api.get(`/users/tips?period=${period}`);
    return data; 
    // Esperamos que retorne: { stats: { total_money... }, history: [...] }
  },

  // 2. Registrar Propina
  registerTip: async (payload) => {
    const { data } = await api.post('/users/tips', payload);
    return data;
  },

  // 3. Pendientes por Registrar (Izquierda)
  // GET /orders?status=completed&pending_tip=true
  getCompletedOrders: async () => {
    const { data } = await api.get('/orders?status=completed&pending_tip=true');
    return data; 
    // Retorna array de órdenes que AÚN NO tienen registro en la tabla 'tips'
  },
  updateProfile: async (data) => {
    // data: { phone, address, etc }
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  // SOLICITAR cambio (Paso 1)
  requestEmailChange: async (payload) => {
    // payload: { new_email, mode: 'standard'|'lost_access', security_answer? }
    const { data } = await api.post('/users/request-email-change', payload);
    return data; // Retorna: { step: 'verify_code' | 'done' }
  },

  // VERIFICAR código (Paso 2 - Solo modo standard)
  verifyEmailChange: async (code) => {
    // Esto enviará un JSON: { "code": "123456" }
    const { data } = await api.post('/users/verify-email-change', { code }); 
    return data;
  },
  
  getNotifications: async () => {
    // Asegúrate de crear esta ruta en tu Backend (UsersController)
    const { data } = await api.get('/users/notifications');
    return data; 
  },

  // 2. Marcar una como leída
  markNotificationAsRead: async (id) => {
    const { data } = await api.patch(`/users/notifications/${id}/read`);
    return data;
  },

  // 3. Marcar todas como leídas
  markAllNotificationsAsRead: async () => {
    const { data } = await api.patch('/users/notifications/read-all');
    return data;
  },
  updateUser: async (id, data) => {
    // data puede ser { is_banned: true } o { role_id: "..." }
    const { data: response } = await api.patch(`/users/${id}`, data);
    return response;
  }

};