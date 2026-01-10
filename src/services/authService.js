import api from '../api/axios';

export default {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  // --- RECUPERACIÓN DE CONTRASEÑA (NUEVO FLUJO) ---
  
  // Paso 1: Iniciar (Backend decide si pide pregunta o manda código)
  initRecovery: async (email) => {
    const { data } = await api.post('/auth/forgot-password/init', { email });
    return data; 
    // Retorna: { required_security_question: boolean, question?: string, message: string }
  },

  // Paso 2: Verificar Pregunta (Solo si required_security_question fue true)
  verifySecurityQuestion: async (email, answer) => {
    const { data } = await api.post('/auth/forgot-password/verify', { email, answer });
    return data; 
  },

  // Paso 3: Resetear Final (Para todos)
  resetPassword: async ({ email, code, newPassword }) => {
    // OJO: Mapeamos newPassword a new_password como pide tu backend
    const payload = { 
        email, 
        code, 
        new_password: newPassword 
    };
    const { data } = await api.post('/auth/forgot-password/reset', payload);
    return data;
  }
};