import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import userService from '../../services/userService';
import Footer from '../../components/layout/Footer';
import { CheckCircle2, Loader2, Mail, User, Shield, MapPin, Phone, CreditCard, Lock } from 'lucide-react';
import Swal from 'sweetalert2';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // CONTROL DE PASOS (1, 2, 3)
  const [step, setStep] = useState(1);

  // DATOS CLAVE
  const [inviteCode, setInviteCode] = useState('');
  const [inviteData, setInviteData] = useState(null);
  const [email, setEmail] = useState('');

  // FORMULARIO FINAL
  const [formData, setFormData] = useState({
    first_names: '',
    last_names: '',
    ci: '',
    phone: '',
    address: '',
    password: '',
    email_code: ''
  });

  // --- PASO 1: VALIDAR INVITACIÓN ---
  const handleValidateInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await userService.validateCode(inviteCode);
      setInviteData(data);
      setStep(2);
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success', 
        title: t('register.validCode', { role: data.role_name || t('register.employee') }), timer: 2000, showConfirmButton: false
      });
    } catch (error) {
      Swal.fire(t('register.error'), t('register.invalidOrExpiredCode'), 'error');
    } finally { setLoading(false); }
  };

  // --- PASO 2: PEDIR CÓDIGO AL GMAIL ---
  const handleRequestEmailCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userService.requestEmailVerification(email);
      setStep(3);
      Swal.fire({
        title: t('register.codeSent'),
        text: t('register.checkInboxForCode', { email: email }),
        icon: 'info'
      });
    } catch (error) {
      console.error("Error completo:", error.response);
      const resData = error.response?.data;
      let serverMessage = resData?.error?.message || resData?.message || resData?.error;
      if (Array.isArray(serverMessage)) {
        serverMessage = serverMessage.join(', ');
      }
      const displayMsg = serverMessage || t('register.couldNotSendEmail');
      Swal.fire(t('register.error'), String(displayMsg), 'error');
    } finally { setLoading(false); }
  };

  // --- PASO 3: REGISTRO FINAL ---
  const handleFinalRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        first_names: formData.first_names,
        last_names: formData.last_names,
        email: email,
        ci: formData.ci,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        invite_code: inviteCode,
        email_code: formData.email_code
      };

      await userService.register(payload);
      
      await Swal.fire({
        title: t('register.welcome'),
        text: t('register.accountCreatedSuccessfully'),
        icon: 'success',
        confirmButtonText: t('register.signIn')
      });
      navigate('/login');
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || t('register.registrationErrorCheckCodes');
      Swal.fire(t('register.registrationError'), String(msg), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      
      {/* 🟢 AJUSTE RESPONSIVE: Padding vertical reducido en móviles (py-6) vs desktop (md:py-10) */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-6 md:py-10">
        
        {/* 🟢 AJUSTE RESPONSIVE: Padding interno de la tarjeta reducido en móvil (p-6) vs desktop (md:p-8) */}
        <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-2xl transition-all border border-gray-100 dark:border-gray-700">
            
            {/* --- PASO 1 --- */}
            {step === 1 && (
                <div className="max-w-md mx-auto">
                    {/* Texto del título ajustado */}
                    <h2 className="text-xl md:text-2xl font-bold text-center mb-2 dark:text-white">{t('register.welcomeToTeam')}</h2>
                    <p className="text-center text-gray-500 mb-6 text-sm">{t('register.enterAdminCode')}</p>
                    
                    <form onSubmit={handleValidateInvite} className="space-y-4">
                        <div className="relative">
                            <Shield className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                            <input 
                                type="text" 
                                placeholder={t('register.inviteCodePlaceholder')}
                                className="w-full pl-10 p-3 border rounded-xl text-center font-mono uppercase text-lg dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                                value={inviteCode} 
                                onChange={e=>setInviteCode(e.target.value.toUpperCase())}
                                autoFocus
                            />
                        </div>
                        <button type="submit" disabled={loading || !inviteCode} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center hover:bg-indigo-700 transition disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin"/> : t('register.validateCode')}
                        </button>
                    </form>
                    <div className="mt-4 text-center"><Link to="/login" className="text-sm text-gray-500 hover:text-primary">{t('register.backToLogin')}</Link></div>
                </div>
            )}

            {/* --- PASO 2 --- */}
            {step === 2 && (
                <div className="max-w-md mx-auto animate-fade-in-up">
                    <div className="text-center mb-6">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block">
                            {t('register.roleDetected', { role: inviteData?.role_name || '' })}
                        </span>
                        <h2 className="text-xl md:text-2xl font-bold dark:text-white">{t('register.verifyEmail')}</h2>
                        <p className="text-gray-500 text-sm mt-1">{t('register.sendSecurityCode')}</p>
                    </div>

                    <form onSubmit={handleRequestEmailCode} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                            <input 
                                type="email" 
                                required
                                placeholder={t('register.emailPlaceholder')}
                                className="w-full pl-10 p-3 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                                value={email} 
                                onChange={e=>setEmail(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setStep(1)} className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold">{t('register.back')}</button>
                            <button type="submit" disabled={loading || !email} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center hover:bg-blue-700 transition disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin"/> : t('register.sendCode')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* --- PASO 3 --- */}
            {step === 3 && (
                <form onSubmit={handleFinalRegister} className="space-y-4 animate-fade-in-up">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 mb-4">
                        <CheckCircle2 className="text-green-500 shrink-0 mt-0.5"/>
                        <div className="text-sm">
                            <p className="font-bold text-blue-800 dark:text-blue-200">{t('register.almostReady')}</p>
                            <p className="text-blue-600 dark:text-blue-300 break-words">{t('register.codeSentToEmailCompleteData', { email: email })}</p>
                        </div>
                    </div>

                    {/* 🟢 GRID RESPONSIVE: 1 columna en móvil, 2 en PC (md) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {/* NOMBRES */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{t('register.firstNames')}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                                <input type="text" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder={t('register.firstNamePlaceholder')} value={formData.first_names} onChange={e=>setFormData({...formData, first_names:e.target.value})}/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{t('register.lastNames')}</label>
                            <input type="text" required className="w-full p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder={t('register.lastNamePlaceholder')} value={formData.last_names} onChange={e=>setFormData({...formData, last_names:e.target.value})}/>
                        </div>

                        {/* CI Y CELULAR */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{t('register.ci')}</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                                <input type="text" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder={t('register.ciPlaceholder')} value={formData.ci} onChange={e=>setFormData({...formData, ci:e.target.value})}/>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{t('register.phone')}</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                                <input type="tel" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder={t('register.phonePlaceholder')} value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})}/>
                            </div>
                        </div>

                        {/* DIRECCIÓN */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{t('register.address')}</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                                <input type="text" required className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder={t('register.addressPlaceholder')} value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})}/>
                            </div>
                        </div>

                        {/* CONTRASEÑA */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{t('register.newPassword')}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                                <input type="password" required minLength="6" className="w-full pl-9 p-2.5 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" placeholder={t('register.minCharacters')} value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/>
                            </div>
                        </div>

                        {/* CÓDIGO EMAIL */}
                        <div className="md:col-span-2 pt-2">
                            <label className="text-xs font-black text-blue-600 uppercase ml-1 block mb-1">{t('register.gmailCode')}</label>
                            <input 
                                type="text" 
                                required 
                                maxLength="6"
                                placeholder={t('register.codePlaceholder')}
                                className="w-full p-3 border-2 border-blue-200 rounded-xl text-center font-mono text-xl tracking-widest focus:border-blue-500 outline-none dark:bg-gray-800 dark:text-white" 
                                value={formData.email_code} 
                                onChange={e=>setFormData({...formData, email_code:e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition">{t('register.back')}</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl flex justify-center hover:bg-green-700 shadow-lg transition active:scale-95">
                            {loading ? <Loader2 className="animate-spin"/> : t('register.finishRegistration')}
                        </button>
                    </div>
                </form>
            )}

        </div>
      </div>

      <Footer />
    </div>
  );
};
export default Register;