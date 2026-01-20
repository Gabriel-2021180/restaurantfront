import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { useTranslation } from 'react-i18next'; // 1. Importar useTranslation
import { ShieldAlert, Save, Loader2, Lock, HelpCircle, Globe } from 'lucide-react'; // 2. Importar Globe
import Swal from 'sweetalert2';

const RequireSecuritySetup = ({ children }) => {
  const { user, updateUser, hasRole } = useAuth();
  // 3. Extraer 't' e 'i18n'
  const { t, i18n } = useTranslation(); 
  
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && !user.security_question && !hasRole('super-admin')) {
      setNeedsSetup(true);
    } else {
      setNeedsSetup(false);
    }
  }, [user, hasRole]);

  // 4. Función para cambiar idioma
  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          const payload = {
              new_question: question.trim(),
              new_answer: answer.trim(),
              current_password: password
          };

          const updatedUserFromBackend = await authService.setupSecurityQuestion(payload);
          updateUser(updatedUserFromBackend);
          
          await Swal.fire({
              title: t('forgotPassword.correct'), // Reutilizamos claves existentes si quieres
              text: 'Tu seguridad ha sido configurada.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
          });
          
      } catch (error) {
          console.error(error);
          const msg = error.response?.data?.message || 'Error al guardar.';
          Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : String(msg), 'error');
      } finally {
          setLoading(false);
      }
  };

  if (needsSetup) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4">
         {/* Agregamos 'relative' para posicionar el botón de idioma */}
         <div className="bg-white dark:bg-dark-card w-full max-w-md p-8 rounded-2xl shadow-2xl border-t-8 border-orange-500 animate-fade-in-up relative">
            
            {/* 5. BOTÓN DE CAMBIO DE IDIOMA (Top Right) */}
            <button 
                type="button"
                onClick={toggleLanguage}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors flex items-center gap-2 text-xs font-bold"
            >
                <Globe size={16} />
                <span>{i18n.language.toUpperCase()}</span>
            </button>

            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                    <ShieldAlert size={40} />
                </div>
                {/* Textos traducidos */}
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">{t('securitySetup.title')}</h2>
                <p className="text-sm text-gray-500 mt-2">
                    {t('securitySetup.subtitle')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <HelpCircle size={12}/> {t('securitySetup.securityQuestion')}
                    </label>
                    <input 
                        type="text" 
                        required 
                        autoFocus
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        placeholder={t('securitySetup.placeholderQuestion')} 
                        value={question} 
                        onChange={e=>setQuestion(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('securitySetup.secretAnswer')}</label>
                    <input 
                        type="text" 
                        required 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        placeholder={t('securitySetup.placeholderAnswer')} 
                        value={answer} 
                        onChange={e=>setAnswer(e.target.value)}
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Lock size={12}/> {t('securitySetup.currentPassword')}
                    </label>
                    <input 
                        type="password" 
                        required 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        placeholder={t('securitySetup.placeholderPassword')} 
                        value={password} 
                        onChange={e=>setPassword(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> {t('securitySetup.button')}</>}
                </button>
            </form>
         </div>
      </div>
    );
  }

  return children;
};

export default RequireSecuritySetup;