import { useState, useEffect, useMemo } from 'react';
import { useTables } from '../../hooks/useTables';
import { useKitchen } from '../../hooks/useKitchen'; 
import Modal from '../../components/ui/Modal';
import KitchenTicket from '../../components/orders/KitchenTicket';
import { ChefHat, Printer, RefreshCw, LayoutGrid, List, Loader2 } from 'lucide-react';

const KitchenControl = () => {
    // Hooks de datos
    const { tables, isLoading: tablesLoading } = useTables();
    
    // Estados de UI (Solo lo visual)
    const [activeTables, setActiveTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    // --- CONEXIÓN EN TIEMPO REAL ---
    // El hook se activa solo cuando seleccionamos una mesa (tiene current_order_id)
    const { history, isLoading: historyLoading, sendToKitchen } = useKitchen(selectedTable?.current_order_id);

    // --- LÓGICA REACTIVA (Aquí arreglamos el problema) ---
    // Calculamos los batches DIRECTAMENTE del history.
    // Si el socket actualiza 'history', esta variable se actualiza sola al instante.
    const batches = useMemo(() => {
        if (!Array.isArray(history)) return [];
        
        // Clonamos y ordenamos: Batch 0 (Nuevo) primero, luego descendente
        return [...history].sort((a, b) => {
            if (a.batch_number === 0) return -1;
            if (b.batch_number === 0) return 1;
            return b.batch_number - a.batch_number;
        });
    }, [history]);

    // Filtrar mesas ocupadas
    useEffect(() => {
        if (tables) {
            const occupied = tables.filter(t => t.status === 'occupied');
            setActiveTables(occupied);
        }
    }, [tables]);

    // --- MANEJADORES ---

    const handleOpenManage = (table) => {
        if (!table.current_order_id) return;
        
        // Solo establecemos la mesa y abrimos.
        // El hook useKitchen detectará el cambio de ID y traerá los datos frescos.
        setSelectedTable(table);
        setSelectedBatch(null); 
        setShowModal(true);
    };

    const handleSelectBatch = (batch) => {
        // Al seleccionar, guardamos una COPIA de los datos actuales para mostrar
        setSelectedBatch({
            ...batch,
            table_number: selectedTable?.table_number || "...",
            order_number: "---" 
        });
    };

    // Auto-seleccionar la primera tanda cuando carguen los datos
    useEffect(() => {
        // Si el modal está abierto, tenemos batches, y no hay nada seleccionado...
        if (showModal && batches.length > 0 && !selectedBatch) {
            handleSelectBatch(batches[0]);
        }
        
        // OPCIONAL: Si estás viendo el modal y llega una NUEVA tanda (Batch 0), 
        // ¿quieres que se seleccione sola? Descomenta esto:
        /*
        if (showModal && batches.length > 0 && batches[0].batch_number === 0) {
             // Si lo que estoy viendo no es el batch 0, cambiar al nuevo
             if (selectedBatch?.batch_number !== 0) {
                 handleSelectBatch(batches[0]);
             }
        }
        */
    }, [batches, showModal]); // Se ejecuta cada vez que 'batches' cambia (Sockets)


    // IMPRIMIR Y MARCAR (Iframe Oculto)
    const [printUrl, setPrintUrl] = useState(null);

    const handlePrintAction = () => {
        if (!selectedBatch || !selectedTable) return;

        // 1. Imprimir
        setPrintUrl(`/print/kitchen/${selectedTable.current_order_id}?batch=${selectedBatch.batch_number}&t=${Date.now()}`);

        // 2. Si es Tanda 0, confirmar al backend
        if (selectedBatch.batch_number === 0) {
            sendToKitchen(selectedTable.current_order_id);
        }
    };

    if (tablesLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ChefHat className="text-orange-500"/> Monitor de Cocina
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Sistema en Vivo
                    </p>
                </div>
                <button onClick={() => window.location.reload()} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                    <RefreshCw size={20}/>
                </button>
            </header>

            {/* GRID DE MESAS */}
            {activeTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-card rounded-2xl border-dashed border-2 border-gray-200 text-gray-400">
                    <LayoutGrid size={48} className="mb-4 opacity-50"/>
                    <p>No hay comandas activas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeTables.map(table => (
                        <div key={table.id} onClick={() => handleOpenManage(table)} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-48 hover:border-orange-400 cursor-pointer transition-all active:scale-95 group relative overflow-hidden">
                            {/* Indicador visual si hay actividad */}
                            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full -mr-8 -mt-8"></div>
                            
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-black text-3xl text-gray-800 dark:text-white">{table.table_number}</span>
                                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">ABIERTA</span>
                                </div>
                                <p className="text-sm text-gray-500">Capacidad: {table.capacity}</p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-dashed border-gray-200 text-center">
                                <span className="font-bold text-sm text-gray-600 flex items-center justify-center gap-2 group-hover:text-orange-600">
                                    <List size={16}/> Ver Comandas
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL GESTIÓN */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Mesa ${selectedTable?.table_number} - Comandas`}>
                <div className="flex flex-col md:flex-row gap-6 h-[70vh]">
                    
                    {/* IZQUIERDA: LISTA EN TIEMPO REAL */}
                    <div className="w-full md:w-1/3 flex flex-col border-r pr-4 bg-gray-50 rounded-l-xl p-4 overflow-y-auto custom-scrollbar">
                        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <List size={18}/> Historial
                            {historyLoading && <Loader2 className="animate-spin w-4 h-4 text-primary ml-auto"/>}
                        </h3>
                        
                        {batches.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                {historyLoading ? 'Cargando...' : 'Sin pedidos aún.'}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {batches.map((batch, index) => {
                                    // Determinar si es nueva y si está seleccionada
                                    const isNew = batch.batch_number === 0;
                                    const isActive = selectedBatch?.batch_number === batch.batch_number;

                                    return (
                                        <div 
                                            key={index} 
                                            onClick={() => handleSelectBatch(batch)}
                                            className={`p-4 rounded-xl cursor-pointer border transition-all ${isActive ? 'bg-white border-primary ring-2 ring-primary/10 shadow-md' : 'bg-white border-gray-200 hover:border-orange-300'}`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-black ${isNew ? 'text-orange-600' : 'text-gray-700'}`}>
                                                    {isNew ? '🔔 POR MARCHAR' : `TANDA #${batch.batch_number}`}
                                                </span>
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                                                    {isNew ? '...' : new Date(batch.sent_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">{batch.items?.length || 0} items</p>
                                            
                                            {isNew && (
                                                <div className="mt-2 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded animate-pulse">
                                                    Esperando confirmación...
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* DERECHA: TICKET PREVIEW */}
                    <div className="flex-1 bg-gray-200 rounded-xl p-4 overflow-y-auto flex flex-col items-center justify-between">
                        {selectedBatch ? (
                            <>
                                <div className="flex-1 w-full flex justify-center items-start overflow-y-auto pb-4">
                                    <div className="scale-90 origin-top">
                                        <KitchenTicket 
                                            data={selectedBatch} 
                                            batchNumber={selectedBatch.batch_number}
                                            sentAt={selectedBatch.sent_at}
                                        />
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handlePrintAction} 
                                    disabled={selectedBatch.batch_number === 0}
                                    className={`w-full py-4 text-white font-bold rounded-xl shadow-2xl transition-transform active:scale-95 flex items-center justify-center gap-2 ${selectedBatch.batch_number === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    <Printer size={24}/> 
                                    {selectedBatch.batch_number === 0 ? 'Esperando al Mesero...' : 'IMPRIMIR COPIA'}
                                </button>
                            </>
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center justify-center h-full">
                                <Printer size={48} className="mb-4 opacity-20"/>
                                <p>Selecciona una tanda.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* IFRAME OCULTO */}
            <iframe 
                src={printUrl} 
                style={{ position: 'absolute', width: 0, height: 0, border: 'none', visibility: 'hidden' }}
                title="print-frame"
            />
        </div>
    );
};

export default KitchenControl;