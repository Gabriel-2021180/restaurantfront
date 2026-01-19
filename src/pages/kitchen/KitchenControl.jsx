import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTables } from '../../hooks/useTables';
import { useKitchen } from '../../hooks/useKitchen'; 
import orderService from '../../services/orderService'; // <--- USAR ESTE SERVICIO
import Modal from '../../components/ui/Modal';
import KitchenTicket from '../../components/orders/KitchenTicket';
import { ChefHat, Printer, RefreshCw, LayoutGrid, List, Loader2, ShoppingBag, Utensils } from 'lucide-react';

const KitchenControl = () => {
    const { t } = useTranslation();
    const { tables, isLoading: tablesLoading } = useTables();
    
    // --- CAMBIO CLAVE: Usamos un estado local para las órdenes activas ---
    const [allActiveOrders, setAllActiveOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    const loadOrders = async () => {
        try {
            // Este endpoint debe traer: pending, in_process y pending_payment
            const data = await orderService.getActiveOrders();
            setAllActiveOrders(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(t('kitchenControl.errorLoadingOrders'), error);
        } finally {
            setLoadingOrders(false);
        }
    };

    // Recargar cada 15s
    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 15000);
        return () => clearInterval(interval);
    }, []);
    
    const [activeTab, setActiveTab] = useState('dine_in');
    const [activeList, setActiveList] = useState([]);
    
    const [selectedItem, setSelectedItem] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const orderIdToTrack = selectedItem?.current_order_id || selectedItem?.id;
    const { history, isLoading: historyLoading, sendToKitchen } = useKitchen(orderIdToTrack);

    // --- FILTRADO CORREGIDO ---
    useEffect(() => {
        if (activeTab === 'dine_in') {
            if (tables) {
                // Mesas ocupadas
                const occupied = tables.filter(t => t.status === 'occupied');
                setActiveList(occupied);
            }
        } else {
            // Pedidos Para Llevar (Pickup)
            // Filtramos las órdenes que NO tienen mesa (table_id === null)
            const pickups = allActiveOrders.filter(o => !o.table || !o.table_id);
            setActiveList(pickups);
        }
    }, [activeTab, tables, allActiveOrders]);

    // ... (El resto del componente sigue igual: batches, handleOpenManage, etc.) ...
    // Copia el resto del archivo KitchenControl.jsx anterior desde aquí hacia abajo.
    // Solo cambia la parte superior donde cargamos los datos.
    
    const batches = useMemo(() => {
        if (!Array.isArray(history)) return [];
        return [...history].sort((a, b) => {
            if (a.batch_number === 0) return -1;
            if (b.batch_number === 0) return 1;
            return b.batch_number - a.batch_number;
        });
    }, [history]);

    const handleOpenManage = (item) => {
        const hasOrder = activeTab === 'dine_in' ? item.current_order_id : item.id;
        if (!hasOrder) return;
        setSelectedItem(item);
        setSelectedBatch(null); 
        setShowModal(true);
    };

    const handleSelectBatch = (batch) => {
    const isTakeaway = activeTab === 'pickup';
    
    setSelectedBatch({
        ...batch,
        // Forzamos que use el número de mesa del item que seleccionaste en la cuadrícula
        table_number: isTakeaway ? null : (selectedItem?.table_number || batch.table_number),
        client_name: isTakeaway ? (selectedItem?.client_name || selectedItem?.pickup_name) : null,
    });
    };

    useEffect(() => {
        if (showModal && batches.length > 0 && !selectedBatch) {
            handleSelectBatch(batches[0]);
        }
    }, [batches, showModal]);

    const [printUrl, setPrintUrl] = useState(null);

    const handlePrintAction = () => {
        if (!selectedBatch || !selectedItem) return;
        const targetId = activeTab === 'dine_in' ? selectedItem.current_order_id : selectedItem.id;
        setPrintUrl(`/print/kitchen/${targetId}?batch=${selectedBatch.batch_number}&t=${Date.now()}`);
        if (selectedBatch.batch_number === 0) {
            sendToKitchen(targetId);
        }
    };

    if (tablesLoading && loadingOrders) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ChefHat className="text-orange-500"/> {t('kitchenControl.kitchenMonitor')}
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        {t('kitchenControl.liveSystem')}
                    </p>
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('dine_in')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'dine_in' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
                        <Utensils size={16}/> {t('kitchenControl.tables')}
                    </button>
                    <button onClick={() => setActiveTab('pickup')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'pickup' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
                        <ShoppingBag size={16}/> {t('kitchenControl.takeAway')}
                    </button>
                </div>

                <button onClick={() => {loadOrders();}} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                    <RefreshCw size={20}/>
                </button>
            </header>

            {activeList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-card rounded-2xl border-dashed border-2 border-gray-200 text-gray-400">
                    <LayoutGrid size={48} className="mb-4 opacity-50"/>
                    <p>{t('kitchenControl.noActiveOrdersInSection')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeList.map(item => {
                        // AJUSTE VISUAL PARA PICKUP
                        const title = activeTab === 'dine_in' ? item.table_number : (item.client_name || item.pickup_name || t('kitchenControl.client'));
                        const subtitle = activeTab === 'dine_in' ? t('kitchenControl.capacity', { capacity: item.capacity }) : t('kitchenControl.orderNumber', { number: item.order_number });
                        const statusColor = activeTab === 'dine_in' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                        const statusText = activeTab === 'dine_in' ? t('kitchenControl.open') : t('kitchenControl.pending');

                        return (
                            <div key={item.id} onClick={() => handleOpenManage(item)} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-48 hover:border-orange-400 cursor-pointer transition-all active:scale-95 group relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full -mr-8 -mt-8 ${activeTab === 'dine_in' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}></div>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black text-2xl text-gray-800 dark:text-white truncate pr-2">{title}</span>
                                        <span className={`${statusColor} px-2 py-1 rounded text-[10px] font-bold shrink-0`}>{statusText}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">{subtitle}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 text-center">
                                    <span className="font-bold text-sm text-gray-600 flex items-center justify-center gap-2 group-hover:text-orange-600">
                                        <List size={16}/> {t('kitchenControl.viewOrders')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${activeTab === 'dine_in' ? t('kitchenControl.table') : t('kitchenControl.client')}: ${selectedItem?.table_number || selectedItem?.client_name || '...'}`}>
                <div className="flex flex-col md:flex-row gap-6 h-[70vh]">
                    <div className="w-full md:w-1/3 flex flex-col border-r pr-4 bg-gray-50 rounded-l-xl p-4 overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <List size={18}/> {t('kitchenControl.history')}
                            {historyLoading && <Loader2 className="animate-spin w-4 h-4 text-primary ml-auto"/>}
                        </h3>
                        {batches.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                {historyLoading ? <Loader2 className="animate-spin text-primary w-8 h-8 mx-auto mb-2"/> : t('kitchenControl.noOrdersYet')}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {batches.map((batch, index) => {
                                    const isNew = batch.batch_number === 0;
                                    const isActive = selectedBatch?.batch_number === batch.batch_number;
                                    return (
                                        <div key={index} onClick={() => handleSelectBatch(batch)} className={`p-4 rounded-xl cursor-pointer border transition-all ${isActive ? 'bg-white border-primary ring-2 ring-primary/10 shadow-md' : 'bg-white border-gray-200 hover:border-orange-300'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-black ${isNew ? 'text-orange-600' : 'text-gray-700'}`}>{isNew ? t('kitchenControl.toPrepare') : t('kitchenControl.batchNumber', { number: batch.batch_number })}</span>
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">{isNew ? '...' : new Date(batch.sent_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{batch.items?.length || 0} {t('kitchenControl.items')}</p>
                                            {isNew && <div className="mt-2 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded animate-pulse">{t('kitchenControl.waitingConfirmation')}</div>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-xl p-4 overflow-y-auto flex flex-col items-center justify-between">
                        {selectedBatch ? (
                            <>
                                <div className="flex-1 w-full flex justify-center items-start overflow-y-auto pb-4">
                                    <div className="scale-90 origin-top">
                                        <KitchenTicket data={selectedBatch} batchNumber={selectedBatch.batch_number} sentAt={selectedBatch.sent_at} />
                                    </div>
                                </div>
                                <button onClick={handlePrintAction} disabled={selectedBatch.batch_number === 0} className={`w-full py-4 text-white font-bold rounded-xl shadow-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 ${selectedBatch.batch_number === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    <Printer size={24}/> {selectedBatch.batch_number === 0 ? t('kitchenControl.waitingCashierWaiter') : t('kitchenControl.printTicket')}
                                </button>
                            </>
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center justify-center h-full">
                                <Printer size={48} className="mb-4 opacity-20"/>
                                <p>{t('kitchenControl.selectBatch')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <iframe src={printUrl} style={{ position: 'absolute', width: 0, height: 0, border: 'none', visibility: 'hidden' }} title="print-frame"/>
        </div>
    );
};

export default KitchenControl;