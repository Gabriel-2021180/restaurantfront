import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { ShieldAlert, Save, Loader2, Lock, HelpCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const RequireSecuritySetup = ({ children }) => {
  // 1. IMPORTANTE: Traemos 'updateUser' del contexto
  const { user, updateUser, hasRole } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // REGLA: Bloquear si no hay pregunta (y no es super-admin)
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
          const payload = {
              new_question: question.trim(),
              new_answer: answer.trim(),
              current_password: password
          };

          // 2. El backend nos devuelve el usuario actualizado
          const updatedUserFromBackend = await authService.setupSecurityQuestion(payload);
          
          // 3. ACTUALIZACIÓN INSTANTÁNEA (Esto arregla el "cargando infinito")
          // Inyectamos el usuario nuevo en el contexto manualmente.
          updateUser(updatedUserFromBackend);

          // Al actualizarse el 'user' en el contexto, el useEffect de arriba correrá,
          // verá que ya tiene 'security_question', y pondrá setNeedsSetup(false).
          
          await Swal.fire({
              title: '¡Protegido!',
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
         <div className="bg-white dark:bg-dark-card w-full max-w-md p-8 rounded-2xl shadow-2xl border-t-8 border-orange-500 animate-fade-in-up">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                    <ShieldAlert size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 dark:text-white">Protege tu Cuenta</h2>
                <p className="text-sm text-gray-500 mt-2">
                    Configura tu seguridad para continuar.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <HelpCircle size={12}/> Pregunta de Seguridad
                    </label>
                    <input 
                        type="text" 
                        required 
                        autoFocus
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        placeholder="Ej: Nombre de mi primera mascota" 
                        value={question} 
                        onChange={e=>setQuestion(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1">Respuesta Secreta</label>
                    <input 
                        type="text" 
                        required 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        placeholder="Respuesta..." 
                        value={answer} 
                        onChange={e=>setAnswer(e.target.value)}
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Lock size={12}/> Contraseña actual
                    </label>
                    <input 
                        type="password" 
                        required 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        placeholder="Confirma tu identidad" 
                        value={password} 
                        onChange={e=>setPassword(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 flex justify-center items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Guardar y Acceder</>}
                </button>
            </form>
         </div>
      </div>
    );
  }

  return children;
};

export default RequireSecuritySetup;