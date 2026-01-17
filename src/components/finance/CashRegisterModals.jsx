import { useState, useEffect } from 'react'; // Importar useEffect
import { useTranslation } from 'react-i18next';
import Modal from '../ui/Modal';
import { DollarSign, Lock, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

const CashRegisterModals = ({ 
    isOpenStatus, sessionData, onOpen, onClose, requestCloseModal, setRequestCloseModal 
}) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Debug para ver qué llega (Abre la consola F12)
    useEffect(() => {
        if (requestCloseModal) {
            console.log("Datos de Sesión para Cierre:", sessionData);
        }
    }, [requestCloseModal, sessionData]);

    const handleOpenSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onOpen(amount);
        setLoading(false);
        setAmount('');
    };

    const handleCloseSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onClose({ cash_count: parseFloat(amount), notes });
        setLoading(false);
        setRequestCloseModal(false);
        setAmount('');
        setNotes('');
    };

    // --- MODAL APERTURA ---
    if (isOpenStatus === false) { 
        return (
            <Modal isOpen={true} onClose={() => {}} title={t('cashierDashboard.openCashRegister')} hideCloseButton>
                <form onSubmit={handleOpenSubmit} className="space-y-6">
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3 items-start">
                        <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20}/>
                        <p className="text-sm text-yellow-800 font-medium">{t('cashierDashboard.countYourMoney')}</p>
                    </div>

                    <div>
                        <label className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            {t('cashierDashboard.startingAmount')}
                        </label>
                        <div className="relative mt-2">
                            <DollarSign className="absolute left-4 top-4 text-gray-400 w-6 h-6"/>
                            <input 
                                type="number" step="0.01" required min="0" autoFocus
                                className="w-full pl-12 p-4 border rounded-2xl text-2xl font-black dark:bg-gray-800 dark:text-white focus:ring-4 focus:ring-green-100 outline-none transition"
                                placeholder="0.00" 
                                value={amount} onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {/* Botón corregido: w-full o flex-1 para que no se rompa */}
                        <button type="submit" disabled={loading || !amount} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-xl transition transform active:scale-95 flex justify-center gap-2 items-center">
                            {loading ? <Loader2 className="animate-spin"/> : t('cashierDashboard.confirmOpen')}
                        </button>
                    </div>
                </form>
            </Modal>
        );
    }

    // --- MODAL CIERRE (CORTE) ---
    return (
        <Modal isOpen={requestCloseModal} onClose={() => setRequestCloseModal(false)} title={t('cashierDashboard.closingReport')}>
            <form onSubmit={handleCloseSubmit} className="space-y-6">
                
                {/* TARJETA DE RESUMEN (Estilo arreglado) */}
                <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                    
                    {/* SECCIÓN 1: BASE + EFECTIVO */}
                    <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">{t('cashierDashboard.initialFund')}</span>
                            <span className="font-mono text-gray-700 dark:text-gray-300 font-bold">
                                {parseFloat(sessionData?.starting_cash || 0).toFixed(2)} Bs
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">{t('cashierDashboard.cashSales')}</span>
                            <span className="font-mono text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                                +{parseFloat(sessionData?.sales?.cash || 0).toFixed(2)} Bs
                            </span>
                        </div>
                    </div>

                    {/* SECCIÓN 2: DIGITAL (QR/TARJETA) */}
                    <div className="space-y-3 py-4 border-b border-gray-200 dark:border-gray-600 border-dashed">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('cashierDashboard.qrSales')}</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                                {parseFloat(sessionData?.sales?.qr || 0).toFixed(2)} Bs
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('cashierDashboard.cardSales')}</span>
                            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                                {parseFloat(sessionData?.sales?.card || 0).toFixed(2)} Bs
                            </span>
                        </div>
                    </div>

                    {/* SECCIÓN 3: TOTAL ESPERADO */}
                    <div className="pt-4 flex justify-between items-center">
                        <span className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">
                            {t('cashierDashboard.expectedInDrawer')}
                        </span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">
                            {parseFloat(sessionData?.expected_in_drawer || 0).toFixed(2)} <span className="text-sm font-bold text-gray-400">Bs</span>
                        </span>
                    </div>
                </div>

                {/* INPUT DE CONTEO */}
                <div className="space-y-2">
                    <label className="font-bold text-sm text-gray-700 dark:text-gray-300 block">
                        {t('cashierDashboard.howMuch')}
                    </label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-4 text-gray-400 w-5 h-5"/>
                        <input 
                            type="number" step="0.01" required min="0" autoFocus
                            className="w-full pl-12 p-4 border-2 border-gray-200 rounded-xl text-xl font-bold dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:border-red-500 focus:ring-0 outline-none transition"
                            placeholder="0.00" 
                            value={amount} onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-right">{t('cashierDashboard.countPhysicalMoney')}</p>
                </div>

                {/* NOTAS */}
                <div>
                    <textarea 
                        className="w-full p-3 border border-gray-200 rounded-xl text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-gray-200 outline-none resize-none"
                        rows="2" 
                        placeholder={t('cashierDashboard.notes')} 
                        value={notes} onChange={e => setNotes(e.target.value)}
                    />
                </div>
                
                {/* BOTÓN CIERRE */}
                <button 
                    type="submit" 
                    disabled={loading || !amount} 
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition transform active:scale-95 flex justify-center gap-2 items-center"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <><Lock size={20}/> {t('cashierDashboard.performCut')}</>}
                </button>
            </form>
        </Modal>
    );
};

export default CashRegisterModals;