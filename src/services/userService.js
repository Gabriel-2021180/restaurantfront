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
  }

  
};