import axios from 'axios';

const api = axios.create({
    // Usa la variable de entorno o el puerto 3000 por defecto
    baseURL: import.meta.env.VITE_API_URL, 
});

// --- INTERCEPTOR DE SOLICITUD (REQUEST) ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- INTERCEPTOR DE RESPUESTA (RESPONSE) ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Detectamos si es un error 401 (No autorizado)
    if (error.response && error.response.status === 401) {
      
      // 🚨 EXCEPCIÓN IMPORTANTE:
      // Si el error viene de validar invitación o login, NO redirigimos.
      // Dejamos que el componente (Register.jsx) maneje el error y muestre la alerta.
      const isAuthRequest = error.config.url.includes('/invites/validate') || 
                            error.config.url.includes('/auth/login') ||
                            error.config.url.includes('/register');

      if (!isAuthRequest) {
          console.error("⛔ Sesión expirada. Redirigiendo al login...");
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
      }
    }
    return Promise.reject(error);
  }
);

export default api;