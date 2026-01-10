import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { DollarSign, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';

const CashRegisterModals = ({ 
    isOpenStatus, // true (abierta), false (cerrada), null (cargando)
    sessionData,  // Datos de la sesión actual (ventas, inicio, etc)
    onOpen,       // Función para abrir
    onClose,      // Función para cerrar
    requestCloseModal, // Estado para saber si el usuario pidió cerrar caja
    setRequestCloseModal // Setter para cerrar el modal de cierre
}) => {
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Limpiar form al cambiar estado
    useEffect(() => {
        setAmount('');
        setNotes('');
    }, [isOpenStatus, requestCloseModal]);

    // --- MANEJO DE APERTURA ---
    const handleOpenSubmit = async (e) => {
        e.preventDefault();
        if (!amount) return;
        setLoading(true);
        await onOpen(amount);
        setLoading(false);
    };

    // --- MANEJO DE CIERRE ---
    const handleCloseSubmit = async (e) => {
        e.preventDefault();
        if (!amount) return;
        setLoading(true);
        await onClose(amount, notes);
        setLoading(false);
        setRequestCloseModal(false);
    };

    // 1. MODAL OBLIGATORIO DE APERTURA (Si isOpenStatus es FALSE)
    if (isOpenStatus === false) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-4 border-green-500 animate-fade-in-up">
                    <div className="text-center mb-6">
                        <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Unlock className="text-green-600 w-8 h-8"/>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Apertura de Caja</h2>
                        <p className="text-gray-500 mt-2">Debes abrir tu turno para comenzar a vender.</p>
                    </div>

                    <form onSubmit={handleOpenSubmit} className="space-y-4">
                        <div>
                            <label className="font-bold text-sm text-gray-700 dark:text-gray-300">Monto Inicial (Cambio)</label>
                            <div className="relative mt-1">
                                <DollarSign className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    autoFocus
                                    required
                                    min="0"
                                    className="w-full pl-10 p-3 border rounded-xl text-lg font-bold dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="Ej: 200.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin"/> : 'ABRIR TURNO'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 2. MODAL DE CIERRE (Solo si el usuario hizo clic en "Cerrar Caja")
    return (
        <Modal isOpen={requestCloseModal} onClose={() => setRequestCloseModal(false)} title="Cierre de Caja (Corte)">
            <form onSubmit={handleCloseSubmit} className="space-y-5">
                
                {/* RESUMEN INFORMATIVO */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Fondo Inicial:</span>
                        <span className="font-bold dark:text-white">{sessionData?.starting_cash} Bs</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ventas Efectivo:</span>
                        <span className="font-bold text-green-600">+{sessionData?.sales?.cash || 0} Bs</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2 border-dashed border-blue-200">
                        <span className="font-black text-blue-800 dark:text-blue-300">ESPERADO EN CAJÓN:</span>
                        <span className="font-black text-xl text-blue-800 dark:text-blue-300">
                            {sessionData?.expected_in_drawer || ((parseFloat(sessionData?.starting_cash)||0) + (parseFloat(sessionData?.sales?.cash)||0))} Bs
                        </span>
                    </div>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg flex gap-2 items-center text-xs text-orange-800 border border-orange-100">
                    <AlertTriangle size={16}/>
                    <p>Cuenta físicamente el dinero antes de ingresar el monto.</p>
                </div>

                <div>
                    <label className="font-bold text-sm text-gray-700 dark:text-gray-300">¿Cuánto dinero contaste?</label>
                    <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        <input 
                            type="number" 
                            step="0.01" 
                            autoFocus
                            required
                            min="0"
                            className="w-full pl-10 p-3 border rounded-xl text-lg font-bold dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="font-bold text-sm text-gray-700 dark:text-gray-300">Observaciones (Opcional)</label>
                    <textarea 
                        className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white text-sm"
                        placeholder="Ej: Billete falso, cliente no quiso cambio..."
                        rows="2"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 flex justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <><Lock size={20}/> REALIZAR CORTE</>}
                </button>
            </form>
        </Modal>
    );
};

export default CashRegisterModals;