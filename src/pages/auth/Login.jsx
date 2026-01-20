import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // 1. Importar hook
import Footer from '../../components/layout/Footer';
import { Loader2, AlertCircle } from 'lucide-react'; 

const Login = () => {
  const { t } = useTranslation(); // 2. Inicializar hook
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/'); 
    } catch (err) {
      // Usamos traducción para el error también
      setError(t('login.incorrectCredentials') || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        
        <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700">
          
          <div className="text-center mb-8">
            {/* Usamos claves de traducción existentes o genéricas */}
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('welcome')}</h1>
            <p className="text-sm text-gray-500">{t('login.signInToContinue')}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-4">
              <AlertCircle size={16}/> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase">
                {t('usersPage.email')} {/* Reutilizamos clave de usuarios */}
              </label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                    {t('usersPage.password')}
                </label>
                <Link to="/forgot-password" class="text-xs text-primary font-bold hover:underline">
                    {t('login.forgotPassword')}
                </Link>
              </div>
              <input 
                type="password" 
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin"/> : t('register.signIn')}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              {t('login.newEmployeeQuestion')} 
              <Link to="/register" className="text-primary font-bold hover:underline">
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