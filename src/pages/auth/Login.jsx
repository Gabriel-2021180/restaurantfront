import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      
      // 1. Obtener el rol crudo
      let roleRaw = '';
      if (typeof user.role === 'object') roleRaw = user.role.slug || user.role.name || '';
      else roleRaw = user.role || '';
      
      const role = roleRaw.toLowerCase();

      console.log("Rol Crudo:", role); 

      // 2. Redirección usando el traductor mental
      if (role.includes('super') || role === t('login.adminRole') || role === t('login.administratorRole')) {
        navigate('/'); 
      } else if (role === t('login.cashierRole') || role === t('login.cashierRoleEn')) {
        navigate('/cashier'); // <--- ¡AQUÍ! Cajero va a Caja
      } else if (role === t('login.waiterRole') || role === t('login.waiterRoleEn')) {
        navigate('/tables'); 
      } else if (role === t('login.chefRole') || role === t('login.cookRole')) {
        navigate('/inventory'); // O cocina
      } else {
        navigate('/tables'); // Default
      }
      
    } catch (error) {
      console.error(error);
      Swal.fire(t('login.error'), t('login.incorrectCredentials'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-black text-center text-primary mb-2">RestoAdmin</h2>
        <p className="text-center text-gray-500 mb-6">{t('login.signInToContinue')}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder={t('login.emailPlaceholder')} required className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={email} onChange={e=>setEmail(e.target.value)}/>
          <input type="password" placeholder={t('login.passwordPlaceholder')} required className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={password} onChange={e=>setPassword(e.target.value)}/>
          <div className="flex justify-end mb-4">
            <Link to="/forgot-password" className="text-sm font-bold text-primary hover:underline">
                {t('login.forgotPassword')}
            </Link>
        </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white font-bold rounded-xl flex justify-center gap-2 hover:bg-primary-dark transition">
            {loading ? <Loader2 className="animate-spin"/> : t('login.enter')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">{t('login.newEmployeeQuestion')} </span>
            <Link to="/register" className="text-primary font-bold hover:underline">{t('login.useCodeHere')}</Link>
        </div>
      </div>
    </div>
  );
};
export default Login;