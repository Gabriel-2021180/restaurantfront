import api from '../api/axios';

const authService = {
  
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      // Importante: Lanzar el error completo para leer response.data.message en el componente
      throw error; 
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getProfile: async () => {
    const response = await api.get(`/auth/profile?_t=${new Date().getTime()}`);
    if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  setupSecurityQuestion: async (data) => {
      const response = await api.patch('/auth/security-question', data);
      return response.data;
  },

  // 🔥 MÉTODOS FALTANTES AGREGADOS (Para el Olvidé mi Contraseña) 🔥

  // 1. Iniciar flujo (Envía correo o pide pregunta)
  initRecovery: async (email) => {
    const response = await api.post('/auth/forgot-password/init', { email });
    return response.data;
  },

  // 2. Verificar respuesta de seguridad (Si es Admin)
  verifySecurityQuestion: async (email, answer) => {
    const response = await api.post('/auth/forgot-password/verify', { email, answer });
    return response.data;
  },

  // 3. Resetear contraseña final
  resetPassword: async ({ email, code, newPassword }) => {
    const response = await api.post('/auth/forgot-password/reset', {
      email,
      code,
      new_password: newPassword // Mapeamos al nombre que espera el DTO del Backend
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },
};

export default authService;