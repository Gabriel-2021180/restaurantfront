import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import { Mail, ShieldQuestion, KeyRound, Loader2, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import Swal from 'sweetalert2';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // ESTADOS DEL FLUJO
  // 1 = Email, 2 = Pregunta, 3 = Código + Nueva Clave
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  
  // DATOS
  const [email, setEmail] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // --- PASO 1: INICIAR (Routeo Dinámico) ---
  const handleInit = async (e) => {
    e.preventDefault();
    if(!email) return;
    
    setLoading(true);
    try {
      // Llamamos a /init
      const response = await authService.initRecovery(email);
      
      // LOGICA DEL BACKEND AQUI:
      if (response.required_security_question) {
          // CASO A: Es Admin -> Vamos al paso 2 (Pregunta)
          setQuestionText(response.question || "¿Pregunta secreta?");
          setStep(2);
          Swal.fire({
              toast: true, position: 'top-end', icon: 'info', 
              title: 'Seguridad detectada: Responde la pregunta.', timer: 3000, showConfirmButton: false
          });
      } else {
          // CASO B: Es Mesero -> Saltamos directo al paso 3 (Código ya enviado)
          setStep(3);
          Swal.fire({
              toast: true, position: 'top-end', icon: 'success', 
              title: 'Código enviado a tu correo.', timer: 3000, showConfirmButton: false
          });
      }

    } catch (error) {
      console.error(error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo verificar el correo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- PASO 2: VERIFICAR PREGUNTA (Solo Admins) ---
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.verifySecurityQuestion(email, answer);
      // Si pasa, recién se envía el correo
      setStep(3);
      Swal.fire({
          icon: 'success', title: 'Correcto', 
          text: 'Hemos enviado el código de verificación a tu correo.'
      });
    } catch (error) {
      Swal.fire('Incorrecto', 'La respuesta no coincide.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- PASO 3: RESETEAR PASSWORD (Todos llegan aquí) ---
  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword({ email, code, newPassword });
      
      await Swal.fire({
          title: '¡Contraseña Actualizada!',
          text: 'Ya puedes iniciar sesión con tu nueva clave.',
          icon: 'success',
          confirmButtonText: 'Ir al Login'
      });
      
      navigate('/login');

    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Código inválido o expirado.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-xl w-full max-w-md transition-all">
        
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                {step === 1 && <Mail size={32}/>}
                {step === 2 && <ShieldQuestion size={32}/>}
                {step === 3 && <Lock size={32}/>}
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white">Recuperar Cuenta</h2>
            <p className="text-sm text-gray-500 mt-1">
                {step === 1 && "Ingresa tu correo para buscar tu cuenta."}
                {step === 2 && "Por seguridad, responde tu pregunta secreta."}
                {step === 3 && "Revisa tu bandeja de entrada."}
            </p>
        </div>

        {/* --- FORMULARIO 1: EMAIL --- */}
        {step === 1 && (
            <form onSubmit={handleInit} className="space-y-5 animate-fade-in">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Correo Electrónico</label>
                    <div className="relative mt-1">
                        <Mail className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        <input 
                            type="email" required autoFocus
                            className="w-full pl-10 p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary" 
                            placeholder="ejemplo@restaurante.com"
                            value={email} onChange={e=>setEmail(e.target.value)}
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition disabled:opacity-50 flex justify-center">
                    {loading ? <Loader2 className="animate-spin"/> : 'Continuar'}
                </button>
            </form>
        )}

        {/* --- FORMULARIO 2: PREGUNTA DE SEGURIDAD --- */}
        {step === 2 && (
            <form onSubmit={handleVerify} className="space-y-5 animate-fade-in">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <p className="text-xs text-indigo-600 dark:text-indigo-300 font-bold uppercase mb-1">Pregunta:</p>
                    <p className="text-lg font-bold text-indigo-900 dark:text-white">¿{questionText}?</p>
                </div>
                
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Tu Respuesta</label>
                    <div className="relative mt-1">
                        <ShieldQuestion className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        <input 
                            type="text" required autoFocus
                            className="w-full pl-10 p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary" 
                            placeholder="Escribe aquí..."
                            value={answer} onChange={e=>setAnswer(e.target.value)}
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition disabled:opacity-50 flex justify-center">
                    {loading ? <Loader2 className="animate-spin"/> : 'Verificar'}
                </button>
            </form>
        )}

        {/* --- FORMULARIO 3: CÓDIGO Y NUEVA CLAVE --- */}
        {step === 3 && (
            <form onSubmit={handleReset} className="space-y-5 animate-fade-in">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex gap-2 items-center text-green-700 dark:text-green-300 text-sm mb-2 border border-green-100 dark:border-green-800">
                    <CheckCircle2 size={18}/> <p>Código enviado a <b>{email}</b></p>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Código de 6 dígitos</label>
                    <input 
                        type="text" required maxLength="6"
                        className="w-full p-3 text-center text-2xl font-mono tracking-widest border-2 border-dashed border-gray-300 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:border-primary uppercase" 
                        placeholder="123456"
                        value={code} onChange={e=>setCode(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nueva Contraseña</label>
                    <div className="relative mt-1">
                        <KeyRound className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        <input 
                            type="password" required minLength="6"
                            className="w-full pl-10 p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary" 
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition disabled:opacity-50 flex justify-center">
                    {loading ? <Loader2 className="animate-spin"/> : 'Cambiar Contraseña'}
                </button>
            </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition">
                <ArrowLeft size={16}/> Volver al Login
            </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;