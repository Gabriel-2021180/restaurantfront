import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { ShieldAlert, Save, Loader2, Lock, HelpCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const RequireSecuritySetup = ({ children }) => {
  const { user, refreshUser, hasRole } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // REGLA MEJORADA: Bloquear si no hay pregunta, A MENOS que sea Super Admin
    if (user && !user.security_question && !hasRole('super-admin')) {
      setNeedsSetup(true);
    } else {
      setNeedsSetup(false);
    }
  }, [user, hasRole]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          // --- CORRECCIÓN AQUÍ: CAMBIAMOS LOS NOMBRES PARA EL BACKEND ---
          const payload = {
              new_question: question.trim(), // Backend espera 'new_question'
              new_answer: answer.trim(),     // Backend espera 'new_answer'
              current_password: password
          };

          await authService.setupSecurityQuestion(payload);
          
          await Swal.fire({
              title: '¡Seguridad Activada!',
              text: 'Tu cuenta ahora está protegida.',
              icon: 'success',
              confirmButtonColor: '#ea580c'
          });
          
          // Refrescamos al usuario para que se desbloquee la pantalla
          await refreshUser(); 
          
      } catch (error) {
          console.error(error);
          const msg = error.response?.data?.message || 'Contraseña incorrecta o datos inválidos.';
          // Si es un array de errores (class-validator), lo mostramos bonito
          Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : String(msg), 'error');
      } finally {
          setLoading(false);
      }
  };

  // SI NECESITA SETUP, MOSTRAMOS EL MODAL BLOQUEANTE
  if (needsSetup) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4">
         <div className="bg-white dark:bg-dark-card w-full max-w-md p-8 rounded-2xl shadow-2xl border-t-8 border-orange-500 animate-fade-in-up">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                    <ShieldAlert size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">Protege tu Cuenta</h2>
                <p className="text-sm text-gray-500 mt-2">
                    Antes de continuar, configura una pregunta de seguridad personalizada. La usarás si olvidas tu contraseña o pierdes el acceso.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <HelpCircle size={12}/> Escribe tu Pregunta de Seguridad
                    </label>
                    <input 
                        type="text" 
                        required 
                        autoFocus
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
                        placeholder="Ej: ¿Cuál es el segundo nombre de mi madre?" 
                        value={question} 
                        onChange={e=>setQuestion(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Tu Respuesta Secreta</label>
                    <input 
                        type="text" 
                        required 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
                        placeholder="Respuesta que solo tú sepas" 
                        value={answer} 
                        onChange={e=>setAnswer(e.target.value)}
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Lock size={12}/> Confirma tu contraseña actual
                    </label>
                    <input 
                        type="password" 
                        required 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" 
                        placeholder="Tu contraseña actual" 
                        value={password} 
                        onChange={e=>setPassword(e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 mt-1 text-right">Necesario para guardar los cambios</p>
                </div>

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-200 dark:hover:shadow-none transition active:scale-95 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Guardar y Acceder al Sistema</>}
                </button>
            </form>
         </div>
      </div>
    );
  }

  // SI NO NECESITA, PASA EL CONTENIDO NORMAL
  return children;
};

export default RequireSecuritySetup;