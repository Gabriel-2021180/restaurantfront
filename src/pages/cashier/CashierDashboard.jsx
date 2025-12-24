import { useState, useEffect } from 'react';
import { useFinance } from '../../hooks/useFinance'; 
import CheckoutModal from '../../components/finance/CheckoutModal';
import InvoiceTicket from '../../components/finance/InvoiceTicket'; 
import { RefreshCw, DollarSign, Clock, LayoutGrid, FileText } from 'lucide-react'; // Agregamos FileText
import { Link } from 'react-router-dom'; // Importamos Link para navegar
import Swal from 'sweetalert2';

const CashierDashboard = () => {
    const { pendingOrders, loadPendingOrders, generateInvoice, loading } = useFinance();
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generatedInvoice, setGeneratedInvoice] = useState(null);

    useEffect(() => {
        loadPendingOrders();
        const interval = setInterval(loadPendingOrders, 15000);
        return () => clearInterval(interval);
    }, [loadPendingOrders]);

    const handleInitiateCheckout = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const handleConfirmCheckout = async (formData) => {
        try {
            // 1. MOSTRAR CARGANDO INMEDIATAMENTE
            Swal.fire({
                title: 'Facturando...',
                text: 'Generando QR y validando con impuestos',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading(); // Ruedita girando
                }
            });

            // 2. LLAMADA AL SERVIDOR
            const invoice = await generateInvoice({
                order_id: selectedOrder.id,
                client_nit: formData.nit,
                client_name: formData.name,
                payment_method: formData.payment_method
            });
            
            setGeneratedInvoice(invoice);
            setIsModalOpen(false);
            
            // 3. CERRAR CARGANDO
            Swal.close(); 

        } catch (error) {
             Swal.close(); // Cerrar loader
             const msg = error.response?.data?.message || "Error al facturar";
             Swal.fire('Error', String(msg), 'error');
        }
    };

    const handleFinish = () => {
        setGeneratedInvoice(null);
        setSelectedOrder(null);
        loadPendingOrders(); 
    };

    // VISTA IMPRESIÓN
    if (generatedInvoice) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 gap-6 p-4 z-50 fixed inset-0">
                 <div className="bg-white p-2 shadow-2xl rounded-lg max-h-[90vh] overflow-y-auto">
                    <InvoiceTicket invoice={generatedInvoice} />
                </div>
                <div className="flex gap-4 print:hidden">
                    <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700">
                        Imprimir Ticket
                    </button>
                    <button onClick={handleFinish} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-xl shadow-lg hover:bg-gray-600">
                        Cerrar y Volver
                    </button>
                </div>
             </div>
        );
    }

    // VISTA PRINCIPAL
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
             <header className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <DollarSign className="text-primary"/> Caja Principal
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Administra los cobros y facturación</p>
                </div>
                
                <div className="flex gap-3">
                    {/* --- BOTÓN NUEVO: VER HISTORIAL --- */}
                    <Link to="/admin/invoices" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                        <FileText size={20}/>
                        <span className="hidden sm:inline">Historial Facturas</span>
                    </Link>

                    <button onClick={loadPendingOrders} className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition active:scale-95">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>
            </header>
            
            {pendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                    <LayoutGrid size={48} className="mb-4 opacity-50"/>
                    <p className="font-bold text-lg">No hay cuentas por cobrar</p>
                    <p className="text-sm">Las mesas cerradas aparecerán aquí.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingOrders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow flex flex-col">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 border-b border-indigo-100 dark:border-indigo-800/30 flex justify-between items-center">
                                <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                                    Mesa {order.table?.table_number || '?'}
                                </span>
                                <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded text-gray-500">
                                    #{order.order_number}
                                </span>
                            </div>

                            <div className="p-5 flex-1">
                                <div className="flex items-center gap-2 text-gray-500 mb-4 text-sm">
                                    <Clock size={16}/>
                                    <span>Espera: - min</span> 
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Total a Pagar</span>
                                    <span className="text-3xl font-black text-gray-800 dark:text-white">
                                        ${parseFloat(order.total).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                                <button 
                                    onClick={() => handleInitiateCheckout(order)}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
                                >
                                    <DollarSign size={20}/> Cobrar Cuenta
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <CheckoutModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onInvoiceGenerated={handleConfirmCheckout} 
            />
        </div>
    );
};

export default CashierDashboard;