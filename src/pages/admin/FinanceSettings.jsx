import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Building2, Loader2 } from 'lucide-react';
import { financeService } from '../../services/financeService'; // <--- IMPORTACIÓN CORRECTA
import Swal from 'sweetalert2';

const FinanceSettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [form, setForm] = useState({
    name: '',
    nit: '',
    address: '',
    phone: '',
    authorization_code: '',
    legend_law: t('financeSettings.defaultLegendLaw'),
    logo_url: ''
  });

  // Cargar datos al entrar
  useEffect(() => {
    const loadData = async () => {
        try {
            const data = await financeService.getConfig();
            if (data) {
                // Rellenamos el form con lo que venga del backend
                setForm({
                    name: data.name || '',
                    nit: data.nit || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    authorization_code: data.authorization_code || '',
                    legend_law: data.legend_law || '',
                    logo_url: data.logo_url || ''
                });
            }
        } catch (error) {
            console.error(t('financeSettings.errorLoadingInitialData'), error);
        } finally {
            setFetching(false);
        }
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        console.log("Enviando datos al backend:", form); // <--- MIRA TU CONSOLA AQUÍ
        
        await financeService.updateConfig(form);
        
        Swal.fire(t('financeSettings.saved'), t('financeSettings.billingDataUpdatedSuccessfully'), 'success');
    } catch (error) {
        console.error("Error guardando:", error);
        // Esto te dirá exactamente qué pasó
        const msg = error.response?.data?.message || t('financeSettings.connectionOrValidationError');
        Swal.fire(t('financeSettings.errorSaving'), msg, 'error');
    } finally {
        setLoading(false);
    }
  };

  if (fetching) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">
            <Building2 className="text-primary" /> {t('financeSettings.billingData')}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('financeSettings.businessName')}</label>
                <input type="text" className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('financeSettings.businessNamePlaceholder')} required />
            </div>

            <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('financeSettings.restaurantNIT')}</label>
                <input type="text" className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} placeholder={t('financeSettings.nitPlaceholder')} required />
            </div>

            <div>
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('financeSettings.phone')}</label>
                <input type="text" className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder={t('financeSettings.phonePlaceholder')} />
            </div>

            <div className="col-span-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('financeSettings.mainAddress')}</label>
                <input type="text" className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder={t('financeSettings.addressPlaceholder')} required />
            </div>

            <div className="col-span-2">
                <label className="text-sm font-bold text-red-500">{t('financeSettings.authorizationCode')}</label>
                <input type="text" className="w-full p-3 border-2 border-red-100 bg-red-50 rounded-xl font-mono text-sm" value={form.authorization_code} onChange={e => setForm({...form, authorization_code: e.target.value})} placeholder={t('financeSettings.authorizationCodePlaceholder')} required />
            </div>

            <div className="col-span-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('financeSettings.lawLegend453')}</label>
                <textarea className="w-full p-3 border rounded-xl h-24 dark:bg-gray-800 dark:text-white" value={form.legend_law} onChange={e => setForm({...form, legend_law: e.target.value})} required />
            </div>

            <div className="col-span-2 flex justify-end mt-4">
                <button type="submit" disabled={loading} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-primary-dark transition">
                    {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                    {t('financeSettings.saveConfiguration')}
                </button>
            </div>
        </form>
    </div>
  );
};

export default FinanceSettings;