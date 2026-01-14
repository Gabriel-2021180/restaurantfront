import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import Modal from '../../components/ui/Modal';
import { User, Mail, Phone, MapPin, ShieldCheck, Edit2, Save, Loader2, AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

const UserProfile = () => {
  const { user, refreshUser, updateUser } = useAuth();
  const { t } = useTranslation();
  console.log("User data in UserProfile:", user);
  
  // Estado Datos Básicos
  const [formData, setFormData] = useState({ first_names: '', last_names: '', phone: '', address: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado Cambio de Email
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailMode, setEmailMode] = useState('selection'); // 'selection', 'standard', 'lost_access', 'verify'
  const [newEmail, setNewEmail] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (user) {
        setFormData({
            first_names: user.first_names || '',
            last_names: user.last_names || '',
            phone: user.phone || '',
            address: user.address || ''
        });
    }
  }, [user]);

  // --- GUARDAR PERFIL BÁSICO ---
  const handleSaveProfile = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
          // El backend devuelve el usuario actualizado en 'updatedUser'
          const updatedUser = await userService.updateProfile(formData);
          
          // 🔥 ACTUALIZACIÓN INSTANTÁNEA
          updateUser(updatedUser); 
          
          setIsEditing(false);
          Swal.fire(
              t('profile.profileUpdateSuccessTitle'), 
              t('profile.profileUpdateSuccessText'), 
              'success'
          );
      } catch (error) {
          Swal.fire(
              t('profile.profileUpdateErrorTitle'), 
              t('profile.profileUpdateErrorText'), 
              'error'
          );
      } finally {
          setSaving(false);
      }
  };

  // --- FLUJO CAMBIO DE CORREO ---
  const handleEmailSubmit = async (e) => {
      e.preventDefault();
      setEmailLoading(true);
      try {
          // PASO FINAL: VERIFICAR CÓDIGO
          if (emailMode === 'verify') {
             const updatedUser = await userService.verifyEmailChange(verificationCode);
              
             updateUser(updatedUser);

              Swal.fire(
                  t('profile.emailChangeSuccessTitle'), 
                  t('profile.emailChangeSuccessText'), 
                  'success'
              );
              setIsEmailModalOpen(false);
              resetEmailFlow();
              return;
          }

          // PASO 1: SOLICITAR CAMBIO (Standard o Lost Access)
          const payload = {
              new_email: newEmail,
              mode: emailMode, 
              security_answer: emailMode === 'lost_access' ? securityAnswer : undefined
          };
          const response = await userService.requestEmailChange(payload);

          if (response.step === 'verify_code') {
              window.location.reload();
              
              Swal.fire(
                  t('profile.emailVerificationInfoTitle'), 
                  t('profile.emailVerificationInfoText', { email: user.email }), 
                  'info'
              );
          } else {
              // Si fue lost_access y pasó la seguridad, se cambia directo
              setEmailMode('verify');
              // CORREGIDO
              Swal.fire(
                  t('profile.emailSecurityUpdateSuccessTitle'), 
                  t('profile.emailSecurityUpdateSuccessText'), 
                  'success'
              );
              setIsEmailModalOpen(false);
              resetEmailFlow();
          }

      } catch (error) {
          console.error(error);
          // CORREGIDO
          Swal.fire(
              t('profile.errorTitle'), 
              error.response?.data?.message || t('profile.processingError'), 
              'error'
          );
      } finally {
          setEmailLoading(false);
      }
  };

  const resetEmailFlow = () => {
      setEmailMode('selection');
      setNewEmail('');
      setSecurityAnswer('');
      setVerificationCode('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ENCABEZADO */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-3xl font-black border-4 border-white shadow-lg">
                {user?.first_names?.charAt(0)}{user?.last_names?.charAt(0)}
            </div>
            <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">{user?.first_names} {user?.last_names}</h1>
                <p className="text-gray-500 font-medium">{user?.role?.name || user?.role}</p>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                        <ShieldCheck size={12}/> {t('profile.activeSecurity')}
                    </span>
                </div>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition ${isEditing ? 'bg-gray-200 text-gray-700' : 'bg-primary text-white shadow-lg'}`}>
                {isEditing ? t('profile.cancelEdit') : <><Edit2 size={18}/> {t('profile.editProfile')}</>}
            </button>
        </div>

        {/* FORMULARIO */}
        <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="label-form"><User size={14}/> {t('profile.firstNames')}</label>
                        <input type="text" disabled={!isEditing} className="input-base w-full p-3 border rounded-xl" value={formData.first_names} onChange={e=>setFormData({...formData, first_names:e.target.value})} placeholder={t('profile.firstNamePlaceholder')}/>
                    </div>
                    <div>
                        <label className="label-form"><User size={14}/> {t('profile.lastNames')}</label>
                        <input type="text" disabled={!isEditing} className="input-base w-full p-3 border rounded-xl" value={formData.last_names} onChange={e=>setFormData({...formData, last_names:e.target.value})} placeholder={t('profile.lastNamePlaceholder')}/>
                    </div>
                    <div>
                        <label className="label-form"><Phone size={14}/> {t('profile.phone')}</label>
                        <input type="tel" disabled={!isEditing} className="input-base w-full p-3 border rounded-xl" value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} placeholder={t('profile.phonePlaceholder')}/>
                    </div>
                    <div>
                        <label className="label-form"><MapPin size={14}/> {t('profile.address')}</label>
                        <input type="text" disabled={!isEditing} className="input-base w-full p-3 border rounded-xl" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})} placeholder={t('profile.addressPlaceholder')}/>
                    </div>
                </div>

                {/* ZONA SEGURA (EMAIL Y CI) */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="opacity-75">
                        {/* CORREGIDO: t('profile.ciFixed') */}
                        <label className="label-form">{t('profile.ciFixed')}</label>
                        <input type="text" disabled className="w-full p-3 border rounded-xl bg-gray-200 dark:bg-gray-700 cursor-not-allowed font-mono" value={user?.ci || ''}/>
                    </div>
                    <div>
                        <label className="label-form flex justify-between">
                            {/* CORREGIDO: t('profile.email') */}
                            <span className="flex items-center gap-1"><Mail size={14}/> {t('profile.email')}</span>
                            {/* CORREGIDO: t('profile.change') */}
                            <button type="button" onClick={() => {resetEmailFlow(); setIsEmailModalOpen(true);}} className="text-primary text-xs font-bold hover:underline">{t('profile.change')}</button>
                        </label>
                        <input type="email" disabled className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600" value={user?.email || ''}/>
                    </div>
                </div>

                {isEditing && (
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={saving} className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold shadow-lg transition flex items-center gap-2">
                            {saving ? <Loader2 className="animate-spin"/> : <><Save size={20}/> {t('profile.saveChanges')}</>}
                        </button>
                    </div>
                )}
            </form>
        </div>

        {/* --- MODAL CAMBIO DE CORREO --- */}
        <Modal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title={t('profile.changeEmailTitle')}>
            <form onSubmit={handleEmailSubmit} className="space-y-5">
                
                {/* 1. SELECCIÓN DE MODO */}
                {emailMode === 'selection' && (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{t('profile.changeEmailSecurityInfo')}</p>
                        <p className="font-bold text-gray-800 dark:text-white">{t('profile.haveAccessToEmail', { email: user?.email })}</p>
                        
                        <button type="button" onClick={() => setEmailMode('standard')} className="w-full p-4 border-2 border-green-100 bg-green-50 rounded-xl flex items-center gap-3 hover:bg-green-100 transition text-left">
                            <div className="bg-green-200 p-2 rounded-full text-green-700"><CheckCircle2 size={20}/></div>
                            <div>
                                <p className="font-bold text-green-800">{t('profile.yesIHaveAccess')}</p>
                                <p className="text-xs text-green-600">{t('profile.verificationCodeWillBeSent')}</p>
                            </div>
                        </button>

                        <button type="button" onClick={() => setEmailMode('lost_access')} className="w-full p-4 border-2 border-orange-100 bg-orange-50 rounded-xl flex items-center gap-3 hover:bg-orange-100 transition text-left">
                            <div className="bg-orange-200 p-2 rounded-full text-orange-700"><AlertTriangle size={20}/></div>
                            <div>
                                <p className="font-bold text-orange-800">{t('profile.noILostAccess')}</p>
                                <p className="text-xs text-orange-600">{t('profile.willUseSecurityQuestion')}</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* 2. FORMULARIO (Standard o Lost Access) */}
                {(emailMode === 'standard' || emailMode === 'lost_access') && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="label-form">{t('profile.newEmailAddress')}</label>
                            <input type="email" required autoFocus className="input-base w-full p-3 border rounded-xl" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder={t('profile.newEmailPlaceholder')}/>
                        </div>

                        {emailMode === 'lost_access' && (
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <p className="text-xs font-bold text-orange-800 uppercase mb-2">{t('profile.securityQuestion')}</p>
                                <p className="mb-2 font-medium text-gray-700">¿{user?.security_question}?</p>
                                <input type="text" required className="w-full p-2 border rounded-lg" placeholder={t('profile.yourSecretAnswer')} value={securityAnswer} onChange={e=>setSecurityAnswer(e.target.value)}/>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setEmailMode('selection')} className="px-4 py-3 bg-gray-100 rounded-xl font-bold">{t('profile.back')}</button>
                            <button type="submit" disabled={emailLoading} className="flex-1 bg-primary text-white font-bold rounded-xl flex justify-center items-center gap-2">
                                {emailLoading ? <Loader2 className="animate-spin"/> : t('profile.continue')}
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. VERIFICACIÓN DE CÓDIGO */}
                {emailMode === 'verify' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-sm flex gap-2">
                            <Mail size={18}/> <span>{t('profile.emailVerificationInfoText', { email: user?.email })}</span>
                        </div>
                        <div>
                            <label className="label-form">{t('profile.emailVerificationCode')}</label>
                            <input type="text" required className="w-full p-3 text-center text-2xl font-mono tracking-widest border rounded-xl uppercase" placeholder={t('profile.codePlaceholder')} maxLength="6" value={verificationCode} onChange={e=>setVerificationCode(e.target.value)}/>
                        </div>
                        <button type="submit" disabled={emailLoading} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg">
                            {emailLoading ? <Loader2 className="animate-spin mx-auto"/> : t('profile.verifyAndChange')}
                        </button>
                    </div>
                )}

            </form>
        </Modal>
    </div>
  );
};

// Helper simple para estilos de etiquetas
const LabelForm = ({children}) => <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">{children}</label>;

export default UserProfile;