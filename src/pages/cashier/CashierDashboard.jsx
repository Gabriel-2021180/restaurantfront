import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../../hooks/useFinance'; 
import { useCashRegister } from '../../hooks/useCashRegister'; 
import financeService  from '../../services/financeService'; 

import CheckoutModal from '../../components/finance/CheckoutModal';
import InvoiceTicket from '../../components/finance/InvoiceTicket'; 
import CashRegisterModals from '../../components/finance/CashRegisterModals'; 
import { useAuth } from '../../context/AuthContext'; 
import { RefreshCw, DollarSign, LayoutGrid, FileText, Lock, Loader2, Printer, CheckCircle, Plus, Phone, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const CashierDashboard = () => {
    const { t } = useTranslation();
    const { user, hasRole } = useAuth();
    // Hooks
    const { pendingOrders, loadPendingOrders, generateInvoice, loading: loadingOrders } = useFinance();
    const { isRegisterOpen, session, checkStatus, openRegister, closeRegister, loading: loadingRegister } = useCashRegister();

    // Estados UI
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [activeTab, setActiveTab] = useState('dine_in'); // 'dine_in' | 'pickup'
    
    // Estados Cobro
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [generatedInvoice, setGeneratedInvoice] = useState(null);

    if (!hasRole(['admin', 'super-admin', 'cashier'])) {
        return <div className="p-10 text-center text-red-500 font-bold">Acceso Restringido</div>;
    }

    useEffect(() => {
        if (isRegisterOpen) {
            loadPendingOrders();
            const interval = setInterval(loadPendingOrders, 15000);
            return () => clearInterval(interval);
        }
    }, [loadPendingOrders, isRegisterOpen]);

    // Filtrar pedidos según la pestaña
    const filteredOrders = pendingOrders.filter(order => {
        if (activeTab === 'dine_in') return order.table !== null; // Es Mesa
        if (activeTab === 'pickup') return order.table === null;  // Es Para Llevar (sin mesa)
        return true;
    });

    // --- LÓGICA DE COBRO ---
    const handleInitiateCheckout = (order) => { setSelectedOrder(order); setIsCheckoutOpen(true); };
    
    const handleConfirmCheckout = async (formData) => {
        try {
            Swal.fire({ title: t('cashierDashboard.invoicing'), didOpen: () => Swal.showLoading() });
            
            let invoice = await generateInvoice({ 
                order_id: selectedOrder.id, 
                client_nit: formData.nit, 
                client_name: formData.name, 
                payment_method: formData.payment_method 
            });
            
            // Fix latencia DB (a veces tarda milisegundos en guardar el detalle)
            const details = invoice.details || invoice.order?.details || [];
            if (details.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                invoice = await financeService.getInvoiceById(invoice.id);
            }

            Swal.close(); 
            setIsCheckoutOpen(false);
            checkStatus(); 
            setGeneratedInvoice(invoice); 
        } catch (error) { 
            Swal.close();
            console.error(error);
            Swal.fire(t('cashierDashboard.error'), t('cashierDashboard.couldNotInvoice'), 'error');
        }
    };

    const handleFinish = () => { 
        setGeneratedInvoice(null); 
        setSelectedOrder(null); 
        loadPendingOrders(); 
    };

    // --- PANTALLA DE ÉXITO ---
    if (generatedInvoice) { 
        return (
            <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full flex flex-col h-[90vh]">
                    <div className="text-center mb-4 shrink-0">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CheckCircle className="text-green-600 w-10 h-10"/>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800">{t('cashierDashboard.checkoutSuccessful')}</h2>
                        <p className="text-gray-500">{t('cashierDashboard.invoiceNumber', { number: generatedInvoice.invoice_number })}</p>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-y-auto p-4 mb-4 flex justify-center shadow-inner">
                        <InvoiceTicket invoice={generatedInvoice} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 shrink-0 print:hidden">
                        <button onClick={() => setTimeout(() => window.print(), 100)} className="py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg">
                            <Printer size={24}/> {t('cashierDashboard.print')}
                        </button>
                        <button onClick={handleFinish} className="py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl">
                            {t('cashierDashboard.next')}
                        </button>
                    </div>
                </div>
            </div>
        ); 
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 relative">
             <CashRegisterModals 
                isOpenStatus={isRegisterOpen} 
                sessionData={session} 
                onOpen={openRegister} 
                onClose={closeRegister} 
                requestCloseModal={showCloseModal} 
                setRequestCloseModal={setShowCloseModal} 
             />

             {/* HEADER */}
             <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <DollarSign className="text-primary"/> {t('cashierDashboard.mainCashier')}
                    </h1>
                    
                    {/* INFORMACIÓN DE SESIÓN (Quién abrió) */}
                    {isRegisterOpen && session ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>
                                {t('cashierDashboard.openBy')} <strong className="text-gray-700 dark:text-gray-300">{session.opened_by}</strong> 
                                • {new Date(session.opened_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    ) : (
                        <p className="text-sm text-red-500 font-bold flex items-center gap-1">
                            <Lock size={12}/> {t('cashierDashboard.cashRegisterClosed')}
                        </p>
                    )}
                </div>
                
                <div className="flex gap-3">
                    {/* BOTÓN NUEVO PEDIDO (LINK) */}
                    {isRegisterOpen && (
                        <Link to="/pickup" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold rounded-xl shadow-lg transition active:scale-95">
                            <Plus size={20}/> <span className="hidden sm:inline">{t('cashierDashboard.newOrder')}</span>
                        </Link>
                    )}

                    {isRegisterOpen && (
                        <button 
                            onClick={() => { checkStatus(); setShowCloseModal(true); }} 
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-800 transition"
                        >
                            <Lock size={18}/> <span className="hidden sm:inline">{t('cashierDashboard.closeCashRegister')}</span>
                        </button>
                    )}

                    <Link to="/admin/invoices" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold rounded-xl hover:bg-indigo-100 transition">
                        <FileText size={20}/> <span className="hidden sm:inline">{t('cashierDashboard.history')}</span>
                    </Link>
                    <button onClick={() => { loadPendingOrders(); checkStatus(); }} className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-200 transition active:rotate-180">
                        <RefreshCw size={20} className={loadingOrders ? 'animate-spin' : ''}/>
                    </button>
                </div>
            </header>

            {isRegisterOpen === false && (
                <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-dark-card rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center p-6">
                    <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded-full mb-4">
                        <Lock size={48} className="text-gray-400"/>
                    </div>
                    <h2 className="text-xl font-bold text-gray-600 dark:text-gray-300">Caja Cerrada</h2>
                    <p className="text-gray-500 max-w-md mt-2">Para comenzar a cobrar pedidos, debes realizar la apertura de caja indicando el monto inicial.</p>
                </div>
            )}
            
            {/* TABS DE PENDIENTES */}
            {isRegisterOpen && (
                <div className="flex bg-white dark:bg-dark-card p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 w-fit">
                    <button onClick={() => setActiveTab('dine_in')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'dine_in' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                        🍽️ {t('cashierDashboard.tables')}
                    </button>
                    <button onClick={() => setActiveTab('pickup')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'pickup' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                        🛍️ {t('cashierDashboard.takeAway')}
                    </button>
                </div>
            )}

            {/* GRID DE PEDIDOS */}
            {loadingRegister ? (
                <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>
            ) : (
                filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                        <LayoutGrid size={48} className="mb-4 opacity-50"/>
                        <p className="font-bold text-lg">{t('cashierDashboard.noPendingOrders')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow flex flex-col">
                                <div className={`p-4 border-b flex justify-between items-center ${activeTab === 'dine_in' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                    <span className="font-bold flex items-center gap-2">
                                        {activeTab === 'dine_in' ? t('cashierDashboard.tableNumber', { number: order.table?.table_number || '?' }) : (order.pickup_name || t('cashierDashboard.counterClient'))}
                                    </span>
                                    <span className="text-xs font-mono bg-white px-2 py-1 rounded text-gray-500">#{order.order_number}</span>
                                </div>
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-gray-500">{t('cashierDashboard.totalToPay')}</span>
                                        <span className="text-3xl font-black text-gray-800 dark:text-white">${parseFloat(order.total).toFixed(2)}</span>
                                    </div>
                                    {activeTab === 'pickup' && order.pickup_phone && (
                                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Phone size={12}/> {order.pickup_phone}</p>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                                    <button onClick={() => handleInitiateCheckout(order)} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2">
                                        <DollarSign size={20}/> {t('cashierDashboard.collectAccount')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* MODAL COBRO */}
            <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onInvoiceGenerated={handleConfirmCheckout} />
        </div>
    );
};

export default CashierDashboard;