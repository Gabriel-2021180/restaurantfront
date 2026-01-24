import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '../../components/layout/Footer';
import { Loader2, AlertCircle, Lock } from 'lucide-react'; // Agregué el icono Lock para cuando se bloquea

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para manejo de errores y bloqueo
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // Nuevo estado para bloquear la UI

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsLocked(false);

    try {
      await login(email, password);
      navigate('/'); 
    } catch (err) {
      const responseData = err.response?.data;
      
      // 🔍 CORRECCIÓN AQUÍ:
      // Tu backend devuelve el mensaje directo en 'error' (si es string) o en 'message'.
      // Validamos todas las posibilidades.
      let msg = '';
      if (responseData) {
        if (typeof responseData.error === 'string') {
           msg = responseData.error; // Caso: { error: "Credenciales inválidas" }
        } else if (responseData.error?.message) {
           msg = responseData.error.message; // Caso: { error: { message: "..." } }
        } else if (responseData.message) {
           // A veces message es un array (errores de validación), tomamos el primero
           msg = Array.isArray(responseData.message) ? responseData.message[0] : responseData.message;
        }
      }

      // --- Lógica de Bloqueo y Errores ---
      if (msg && (msg.toLowerCase().includes('bloqueada') || msg.toLowerCase().includes('locked'))) {
        setIsLocked(true);
        const minutesMatch = msg.match(/(\d+)\s*(minutos|minutes)/);
        const minutes = minutesMatch ? minutesMatch[1] : '5'; 
        setError(t('auth.login.error_lockout', { minutes }) || `Cuenta bloqueada. Intenta en ${minutes} minutos.`);
      } 
      else if (msg === 'Credenciales inválidas' || err.response?.status === 401) {
        setError(t('auth.login.incorrectCredentials') || 'Credenciales incorrectas');
      } 
      else {
        // Si msg sigue vacío, es porque de verdad no hubo conexión o el error es raro
        setError(msg || t('auth.login.connectionError') || 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        
        <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('welcome')}</h1>
            <p className="text-sm text-gray-500">{t('login.signInToContinue')}</p>
          </div>

          {/* CAJA DE ERROR */}
          {error && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 mb-4 animate-pulse ${
              isLocked 
                ? 'bg-red-100 text-red-800 border border-red-200' // Estilo más fuerte si está bloqueado
                : 'bg-red-50 text-red-600'
            }`}>
              {isLocked ? <Lock size={16} /> : <AlertCircle size={16}/>} 
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">
                {t('usersPage.email')}
              </label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isLocked} // Deshabilitamos si está bloqueado
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                    {t('usersPage.password')}
                </label>
                <Link to="/forgot-password" className="text-xs text-primary font-bold hover:underline">
                    {t('login.forgotPassword')}
                </Link>
              </div>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isLocked} // Deshabilitamos si está bloqueado
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || isLocked} // Botón deshabilitado si está bloqueado
              className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 ${
                isLocked
                  ? 'bg-gray-400 text-white cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary-dark text-white shadow-primary/30'
              }`}
            >
              {loading ? <Loader2 className="animate-spin"/> : (isLocked ? t('auth.login.locked_btn') || 'Bloqueado' : t('register.signIn'))}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              {t('login.newEmployeeQuestion')} 
              <Link to="/register" className="text-primary font-bold hover:underline ml-1">
                {t('login.useCodeHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;