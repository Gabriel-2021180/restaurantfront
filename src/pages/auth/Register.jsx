import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import userService from '../../services/userService';
import { CheckCircle2, Loader2, Mail, User, Shield, MapPin, Phone, CreditCard, Lock } from 'lucide-react';
import Swal from 'sweetalert2';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // CONTROL DE PASOS (1, 2, 3)
  const [step, setStep] = useState(1);

  // DATOS CLAVE
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState(null); // Rol devuelto por el backend
  const [email, setEmail] = useState(''); // El correo validado

  // FORMULARIO FINAL
  const [formData, setFormData] = useState({
    first_names: '',
    last_names: '',
    ci: '',
    phone: '',
    address: '',
    password: '',
    email_code: '' // El código de 6 dígitos del correo
  });

  // --- PASO 1: VALIDAR INVITACIÓN ---
  const handleValidateInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await userService.validateCode(inviteCode);
      setInviteData(data); // Guardamos info del rol (ej: "Mesero")
      setStep(2); // Pasamos a pedir correo
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success', 
        title: `Código válido: ${data.role_name || 'Empleado'}`, timer: 2000, showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Error', 'Código de invitación inválido o expirado.', 'error');
    } finally { setLoading(false); }
  };

  // --- PASO 2: PEDIR CÓDIGO AL GMAIL ---
  const handleRequestEmailCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userService.requestEmailVerification(email);
      setStep(3); // Pasamos al formulario final
      Swal.fire({
        title: '¡Código Enviado!',
        text: `Revisa tu bandeja de entrada en ${email} para obtener el código de verificación.`,
        icon: 'info'
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo enviar el correo. Verifica que sea válido.', 'error');
    } finally { setLoading(false); }
  };

  // --- PASO 3: REGISTRO FINAL ---
  const handleFinalRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Armamos el payload final exacto como lo pide tu backend
      const payload = {
        first_names: formData.first_names,
        last_names: formData.last_names,
        email: email, // Usamos el email del paso 2
        ci: formData.ci,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        invite_code: inviteCode, // Código del paso 1
        email_code: formData.email_code // Código del paso 3
      };

      await userService.register(payload);
      
      await Swal.fire({
        title: '¡Bienvenido!',
        text: 'Tu cuenta ha sido creada exitosamente.',
        icon: 'success',
        confirmButtonText: 'Iniciar Sesión'
      });
      
      navigate('/login');

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al registrarse. Revisa los códigos.';
      Swal.fire('Error de Registro', String(msg), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-10">
      <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-xl w-full max-w-2xl transition-all">
        
        {/* --- PASO 1: CÓDIGO DE INVITACIÓN --- */}
        {step === 1 && (
            <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-center mb-2 dark:text-white">Bienvenido al Equipo</h2>
                <p className="text-center text-gray-500 mb-6 text-sm">Ingresa el código que te dio el administrador.</p>
                
                <form onSubmit={handleValidateInvite} className="space-y-4">
                    <div className="relative">
                        <Shield className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        <input 
                            type="text" 
                            placeholder="CÓDIGO DE INVITACIÓN (Ej: MES-X92B)" 
                            className="w-full pl-10 p-3 border rounded-xl text-center font-mono uppercase text-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                            value={inviteCode} 
                            onChange={e=>setInviteCode(e.target.value.toUpperCase())}
                            autoFocus
                        />
                    </div>
                    <button type="submit" disabled={loading || !inviteCode} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center hover:bg-indigo-700 transition disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin"/> : 'Validar Código'}
                    </button>
                </form>
                <div className="mt-4 text-center"><Link to="/login" className="text-sm text-gray-500 hover:text-primary">Volver al Login</Link></div>
            </div>
        )}

        {/* --- PASO 2: VERIFICAR EMAIL --- */}
        {step === 2 && (
            <div className="max-w-md mx-auto animate-fade-in-up">
                <div className="text-center mb-6">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                        Rol detectado: {inviteData?.role_name}
                    </span>
                    <h2 className="text-xl font-bold dark:text-white">Verifica tu Correo</h2>
                    <p className="text-gray-500 text-sm mt-1">Te enviaremos un código de seguridad.</p>
                </div>

                <form onSubmit={handleRequestEmailCode} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        <input 
                            type="email" 
                            required
                            placeholder="tu.correo@gmail.com" 
                            className="w-full pl-10 p-3 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                            value={email} 
                            onChange={e=>setEmail(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setStep(1)} className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">Atrás</button>
                        <button type="submit" disabled={loading || !email} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center hover:bg-blue-700 transition disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin"/> : 'Enviar Código'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* --- PASO 3: DATOS PERSONALES --- */}
        {step === 3 && (
            <form onSubmit={handleFinalRegister} className="space-y-4 animate-fade-in-up">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 mb-4">
                    <CheckCircle2 className="text-green-500 shrink-0 mt-0.5"/>
                    <div className="text-sm">
                        <p className="font-bold text-blue-800 dark:text-blue-200">¡Casi listo!</p>
                        <p className="text-blue-600 dark:text-blue-300">Hemos enviado un código a <b>{email}</b>. Completa tus datos para finalizar.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* NOMBRES */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nombres</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                            <input type="text" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="Juan Carlos" value={formData.first_names} onChange={e=>setFormData({...formData, first_names:e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Apellidos</label>
                        <input type="text" required className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="Pérez" value={formData.last_names} onChange={e=>setFormData({...formData, last_names:e.target.value})}/>
                    </div>

                    {/* CI Y CELULAR */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Cédula (CI)</label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                            <input type="text" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="1234567" value={formData.ci} onChange={e=>setFormData({...formData, ci:e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Celular</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                            <input type="tel" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="70012345" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})}/>
                        </div>
                    </div>

                    {/* DIRECCIÓN */}
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Dirección</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                            <input type="text" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="Av. Principal #123" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})}/>
                        </div>
                    </div>

                    {/* CONTRASEÑA */}
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Contraseña Nueva</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                            <input type="password" required minLength="6" className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white" placeholder="Mínimo 6 caracteres" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/>
                        </div>
                    </div>

                    {/* CÓDIGO EMAIL */}
                    <div className="md:col-span-2 pt-2">
                        <label className="text-xs font-black text-blue-600 uppercase ml-1 block mb-1">Código recibido en Gmail</label>
                        <input 
                            type="text" 
                            required 
                            maxLength="6"
                            placeholder="123456" 
                            className="w-full p-3 border-2 border-blue-200 rounded-xl text-center font-mono text-xl tracking-widest focus:border-blue-500 outline-none dark:bg-gray-800 dark:text-white" 
                            value={formData.email_code} 
                            onChange={e=>setFormData({...formData, email_code:e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">Atrás</button>
                    <button type="submit" disabled={loading} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl flex justify-center hover:bg-green-700 shadow-lg transition">
                        {loading ? <Loader2 className="animate-spin"/> : 'Finalizar Registro'}
                    </button>
                </div>
            </form>
        )}

      </div>
    </div>
  );
};
export default Register;