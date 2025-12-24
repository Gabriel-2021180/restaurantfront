import { useState } from 'react';
import { Receipt, User, CheckCircle, Loader2, Banknote, QrCode, CreditCard } from 'lucide-react';
import Modal from '../../components/ui/Modal'; 

const CheckoutModal = ({ isOpen, onClose, onInvoiceGenerated }) => {
    const [loading, setLoading] = useState(false);
    
    // ESTADO PARA EL MÉTODO DE PAGO
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO'); // Default
    
    const [clientData, setClientData] = useState({
        nit: '',
        name: ''
    });

    const handleCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Enviamos también el método de pago seleccionado
            await onInvoiceGenerated({
                nit: clientData.nit,
                name: clientData.name,
                payment_method: paymentMethod // <--- DATO NUEVO
            });

            setClientData({ nit: '', name: '' });
            setPaymentMethod('EFECTIVO'); // Resetear al cerrar
            
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Helper para botones de selección
    const MethodButton = ({ method, icon: Icon, label }) => (
        <button
            type="button"
            onClick={() => setPaymentMethod(method)}
            className={`flex-1 py-3 px-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                paymentMethod === method 
                ? 'border-primary bg-indigo-50 text-primary font-bold shadow-sm' 
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
        >
            <Icon size={24} />
            <span className="text-xs">{label}</span>
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Emitir Factura">
            <form onSubmit={handleCheckout} className="space-y-6">
                
                {/* SELECCIÓN DE MÉTODO DE PAGO */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Método de Pago</label>
                    <div className="flex gap-3">
                        <MethodButton method="EFECTIVO" icon={Banknote} label="Efectivo" />
                        <MethodButton method="QR" icon={QrCode} label="QR Simple" />
                        <MethodButton method="TARJETA" icon={CreditCard} label="Tarjeta" />
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 flex gap-3">
                    <Receipt className="shrink-0" />
                    <p>Si el cliente no requiere datos, deja los campos en blanco ("SIN NOMBRE").</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">NIT / CI Cliente</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                placeholder="0" 
                                className="w-full p-3 pl-10 border rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none dark:text-white"
                                value={clientData.nit}
                                onChange={e => setClientData({...clientData, nit: e.target.value})}
                            />
                            <span className="absolute left-3 top-3.5 text-gray-400 font-bold">#</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Razón Social / Nombre</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="SIN NOMBRE" 
                                className="w-full p-3 pl-10 border rounded-xl bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-primary outline-none uppercase dark:text-white"
                                value={clientData.name}
                                onChange={e => setClientData({...clientData, name: e.target.value})}
                            />
                            <User className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 text-lg"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                    Cobrar y Facturar
                </button>
            </form>
        </Modal>
    );
};

export default CheckoutModal;