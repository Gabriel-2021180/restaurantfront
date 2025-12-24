import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  // 1. AQUI ESTABA EL ERROR: Faltaba sacar 'hasRole' del contexto
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  // 2. Si no está logueado -> Login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

 
  if (allowedRoles && !hasRole(allowedRoles)) {
    // Si no tiene permiso, lo mandamos al inicio
    return <Navigate to="/" replace />; 
  }

  return children;
};

export default ProtectedRoute;