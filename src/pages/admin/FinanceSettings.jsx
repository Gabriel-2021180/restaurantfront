import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next'; // <--- IMPORTAR
import financeService from '../../services/financeService';
import { Save, Building, Clock, Info, Loader2, FileText, Phone, Hash, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';

const FinanceSettings = () => {
  const { t } = useTranslation(); // <--- HOOK
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, setValue, watch } = useForm();

  const enableAutoClose = watch('enable_auto_close');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await financeService.getSettings();
      if (data) {
          Object.keys(data).forEach(key => setValue(key, data[key]));
      } else {
          setValue('enable_auto_close', false);
          setValue('auto_close_time', '00:00');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (formData) => {
    setSaving(true);
    try {
      // 🔥 CORRECCIÓN CLAVE: FILTRAR EL PAYLOAD
      // Solo enviamos los campos que el DTO espera, eliminando id, created_at, etc.
      const payload = {
          name: formData.name,
          address: formData.address,
          nit: formData.nit,
          phone: formData.phone,
          legend_law: formData.legend_law,
          enable_auto_close: Boolean(formData.enable_auto_close),
          auto_close_time: formData.auto_close_time || '00:00'
      };

      console.log("Enviando limpio:", payload); 

      await financeService.updateSettings(payload);
      
      Swal.fire({
          icon: 'success',
          title: t('financeSettings.successTitle'),
          text: t('financeSettings.successMessage'),
          confirmButtonColor: '#10b981',
          timer: 2000,
          showConfirmButton: false
      });
      
      loadSettings(); // Recargar para confirmar

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || t('financeSettings.errorMessage');
      toast.error(Array.isArray(msg) ? msg[0] : msg); 
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
      <div className="flex flex-col h-[80vh] items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin"/>
          <p className="text-gray-500 font-medium">Loading...</p>
      </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
      <Toaster position="top-right"/>
      
      {/* HEADER */}
      <div className="mb-8 mt-4">
          <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">{t('financeSettings.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">{t('financeSettings.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* TARJETA 1: DATOS FISCALES */}
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Building className="text-white w-6 h-6"/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{t('financeSettings.legalInfoTitle')}</h3>
                    <p className="text-blue-100 text-sm">{t('financeSettings.legalInfoSubtitle')}</p>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText size={16} className="text-blue-500"/> {t('financeSettings.businessName')}
                    </label>
                    <input 
                        {...register('name')} 
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium dark:text-white"
                        placeholder="Ej: Restaurante El Buen Sabor"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Hash size={16} className="text-blue-500"/> {t('financeSettings.nit')}
                    </label>
                    <input 
                        {...register('nit')} 
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium dark:text-white"
                    />
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500"/> {t('financeSettings.address')}
                    </label>
                    <input 
                        {...register('address')} 
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium dark:text-white"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Phone size={16} className="text-blue-500"/> {t('financeSettings.phone')}
                    </label>
                    <input 
                        {...register('phone')} 
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium dark:text-white"
                    />
                </div>

                <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Info size={16} className="text-blue-500"/> {t('financeSettings.legendLaw')}
                    </label>
                    <textarea 
                        {...register('legend_law')} 
                        rows="2" 
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium resize-none dark:text-white"
                    />
                </div>
            </div>
        </div>

        {/* TARJETA 2: AUTOMATIZACIÓN */}
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl shadow-gray-100/50 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Clock className="text-white w-6 h-6"/>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{t('financeSettings.automationTitle')}</h3>
                    <p className="text-indigo-100 text-sm">{t('financeSettings.automationSubtitle')}</p>
                </div>
            </div>

            <div className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    
                    {/* SWITCH */}
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                            <label className="relative inline-block w-14 h-8 cursor-pointer touch-manipulation">
                                <input 
                                    type="checkbox" 
                                    id="autoCloseSwitch" 
                                    {...register('enable_auto_close')} 
                                    className="peer sr-only"
                                />
                                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-green-500 transition-colors duration-300"></div>
                                <div className="absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 peer-checked:translate-x-6 shadow-sm"></div>
                            </label>
                            <label htmlFor="autoCloseSwitch" className="font-bold text-gray-800 dark:text-white cursor-pointer select-none text-lg">
                                {enableAutoClose ? t('financeSettings.autoCloseActive') : t('financeSettings.autoCloseInactive')}
                            </label>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            {t('financeSettings.autoCloseDesc')}
                        </p>
                    </div>

                    {/* SELECTOR DE HORA */}
                    <div className={`transition-all duration-500 overflow-hidden ${enableAutoClose ? 'opacity-100 max-h-40' : 'opacity-50 max-h-40 grayscale blur-[1px] pointer-events-none'}`}>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-600 flex flex-col items-center min-w-[200px]">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('financeSettings.closingTime')}</label>
                            <div className="relative">
                                <input 
                                    type="time" 
                                    {...register('auto_close_time')} 
                                    className="text-3xl font-black bg-transparent border-b-2 border-gray-300 focus:border-purple-500 outline-none text-center w-full py-1 text-gray-800 dark:text-white font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTÓN GUARDAR FLOTANTE */}
        <div className="sticky bottom-6 flex justify-end">
            <button 
                type="submit" 
                disabled={saving}
                className="group relative px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl shadow-2xl hover:shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3 overflow-hidden"
            >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                {saving ? <Loader2 className="animate-spin"/> : <Save size={22}/>}
                <span className="text-lg">{t('financeSettings.saveButton')}</span>
            </button>
        </div>

      </form>
    </div>
  );
};

export default FinanceSettings;