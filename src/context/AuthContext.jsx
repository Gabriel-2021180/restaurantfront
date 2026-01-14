import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Error sesión:", e);
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };
  const refreshUser = async () => {
    try {
      // Si tenemos token, pedimos los datos frescos
      if (token) {
          const freshUser = await authService.getProfile();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
          return freshUser;
      }
    } catch (error) {
      console.error("Error refrescando usuario", error);
    }
  };

  const updateUser = (userData) => {
      setUser(prev => {
          // Mezclamos los datos viejos con los nuevos
          const updated = { ...prev, ...userData };
          // Guardamos en LocalStorage para que persista al F5
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
      });
  };

  // --- LÓGICA DE ROLES (TRADUCTOR ESPAÑOL -> SYSTEM) ---
  const hasRole = (allowedRoles) => {
    if (!user) return false;

    // 1. OBTENER EL ROL CRUDO (Lo que venga del backend)
    let rawRole = '';
    if (typeof user.role === 'object' && user.role !== null) {
        // Intenta slug, si no name, si no string vacío
        rawRole = user.role.slug || user.role.name || '';
    } else if (typeof user.role === 'string') {
        rawRole = user.role;
    }

    const cleanRawRole = rawRole.toLowerCase().trim();

    // 3. DICCIONARIO DE TRADUCCIÓN (AQUÍ ESTÁ LA MAGIA ✨)
    let systemRole = cleanRawRole;

    if (cleanRawRole === 'cajero' || cleanRawRole === 'cashier') {
        systemRole = 'cashier';
    } 
    else if (cleanRawRole === 'mesero' || cleanRawRole === 'waiter' || cleanRawRole === 'garzon') {
        systemRole = 'waiter';
    }
    else if (cleanRawRole === 'admin' || cleanRawRole === 'administrador') {
        systemRole = 'admin';
    }
    else if (cleanRawRole === 'chef' || cleanRawRole === 'cocinero') {
        systemRole = 'chef';
    }
    else if (cleanRawRole.includes('super')) {
        systemRole = 'super-admin';
    }

    // 4. VERIFICACIÓN FINAL
    // Si eres super-admin, pasas siempre
    if (systemRole === 'super-admin') return true;

    // Comparar con lo que pide el componente (Layout)
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(systemRole);
    }
    return systemRole === allowedRoles;
  };

  return (
    <AuthContext.Provider value={{ 
        user, token, isAuthenticated, login, logout, hasRole, loading,
        refreshUser,updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};