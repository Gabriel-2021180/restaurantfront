import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInventory } from '../../hooks/useInventory';
import { useProducts } from '../../hooks/useProducts'; // Necesitamos updateProduct aquí
import Modal from '../../components/ui/Modal';
import { Plus, Package, ShoppingCart, Loader2, Beef, Box, AlertTriangle, Pencil, Trash2, ArrowUpCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const Supplies = () => {
  const { t } = useTranslation();
  // HOOKS
  const { supplies, isLoading: loadingSupplies, createSupply, addStock, updateSupply, deleteSupply } = useInventory();
  // Agregamos updateProduct para la lógica de reventa
  const { products, isLoading: loadingProducts, updateProduct } = useProducts();
  
  // Tabs
  const [activeTab, setActiveTab] = useState('raw');
  
  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  
  // Estado para Edición
  const [editingItem, setEditingItem] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formularios
  const [formCreate, setFormCreate] = useState({ name: '', cost_per_kilo: '', current_stock_kilo: '', min_stock_kilo: '' });
  // Usamos el mismo form para ambos, pero interpretamos los datos según el tipo
  const [formStock, setFormStock] = useState({ quantity: '', new_cost: '' });

  const rawMaterials = supplies; 
  // Filtramos solo los productos que controlan stock (Reventa)
  const resaleProducts = products.filter(p => p.track_stock === true);

  // --- ABRIR MODAL CREAR / EDITAR (MATERIA PRIMA) ---
  const handleOpenCreate = () => {
      setEditingItem(null);
      setFormCreate({ name: '', cost_per_kilo: '', current_stock_kilo: '', min_stock_kilo: '' });
      setIsCreateOpen(true);
  };

  const handleOpenEdit = (item) => {
      setEditingItem(item);
      setFormCreate({
          name: item.name,
          cost_per_kilo: (item.cost_per_unit * 1000).toFixed(2), 
          current_stock_kilo: (item.current_stock / 1000).toFixed(2), 
          min_stock_kilo: (item.min_stock_alert / 1000).toFixed(2)
      });
      setIsCreateOpen(true);
  };

  const handleDelete = (id) => {
      Swal.fire({
          title: t('supplies.deleteSupply'),
          text: t('supplies.affectsRecipes'),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: t('supplies.yesDelete')
      }).then((r) => { if(r.isConfirmed) deleteSupply(id) });
  };

  // --- GUARDAR MATERIA PRIMA ---
  const handleSaveRaw = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const costPerKilo = parseFloat(formCreate.cost_per_kilo);
        const stockEnKilos = parseFloat(formCreate.current_stock_kilo);
        const minStockEnKilos = parseFloat(formCreate.min_stock_kilo);

        if (isNaN(costPerKilo) || isNaN(stockEnKilos)) throw new Error(t('supplies.invalidNumericData'));

        const payload = {
            name: formCreate.name,
            unit: 'GRAMO', 
            cost_per_unit: costPerKilo / 1000, 
            current_stock: stockEnKilos * 1000, 
            min_stock_alert: minStockEnKilos * 1000 
        };

        if (editingItem) {
            await updateSupply({ id: editingItem.id, data: payload });
        } else {
            await createSupply(payload);
        }
        setIsCreateOpen(false);
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  // --- MANEJO DE STOCK (REPOSICIÓN) ---
  const handleOpenStock = (item, type) => {
    setSelectedItem({ ...item, type }); // type puede ser 'raw' o 'resale'
    
    // Pre-llenar el costo actual para facilitar
    let currentCost = '';
    if (type === 'raw') currentCost = (item.cost_per_unit * 1000).toFixed(2);
    else currentCost = item.purchase_price;

    setFormStock({ quantity: '', new_cost: currentCost });
    setIsStockOpen(true);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        const qtyInput = parseFloat(formStock.quantity);
        const costInput = parseFloat(formStock.new_cost);

        if (selectedItem.type === 'raw') {
            // LÓGICA 1: MATERIA PRIMA (Usa InventoryService - AddStock)
            await addStock({
                id: selectedItem.id,
                data: { quantity: qtyInput * 1000, new_cost: costInput / 1000 } // Convertimos Kg a Gr
            });

        } else if (selectedItem.type === 'resale') {
            // LÓGICA 2: REVENTA (Usa ProductService - Update)
            // Aquí hacemos la matemática simple: Stock Actual + Lo que compraste
            const currentStock = parseInt(selectedItem.stock) || 0;
            const newTotalStock = currentStock + parseInt(qtyInput);

            // Reutilizamos la ruta de editar producto, enviando solo lo que cambió
            await updateProduct({
                id: selectedItem.id,
                data: {
                    stock: newTotalStock,      // El nuevo total
                    purchase_price: costInput, // Actualizamos el costo de compra si cambió
                    track_stock: true          // Mantenemos el flag
                }
            });
            
            Swal.fire(t('supplies.stockUpdated'), t('supplies.newTotalUnits', { newTotalStock }), 'success');
        }

        setIsStockOpen(false);
    } catch (error) { 
        console.error(error); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  if (loadingSupplies || loadingProducts) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                <Package className="text-orange-500"/> {t('supplies.inventoryWarehouse')}
            </h2>
            <div className="flex gap-2 mt-2">
                <button onClick={() => setActiveTab('raw')} className={`px-3 py-1 rounded-lg text-sm font-bold transition ${activeTab === 'raw' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>🥩 {t('supplies.rawMaterial')}</button>
                <button onClick={() => setActiveTab('resale')} className={`px-3 py-1 rounded-lg text-sm font-bold transition ${activeTab === 'resale' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>🥤 {t('supplies.resale')}</button>
            </div>
        </div>
        {activeTab === 'raw' && (
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition active:scale-95">
                <Plus size={18} /> {t('supplies.newRawMaterial')}
            </button>
        )}
      </div>

      {/* --- TAB 1: MATERIA PRIMA --- */}
      {activeTab === 'raw' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rawMaterials.map(item => {
                const stockKg = item.current_stock / 1000;
                const costKg = item.cost_per_unit * 1000; 
                const alertKg = item.min_stock_alert / 1000;

                return (
                    <div key={item.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(item)} className="p-1.5 bg-gray-100 hover:bg-blue-100 text-blue-600 rounded-lg"><Pencil size={14}/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-gray-100 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 size={14}/></button>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-50 rounded-lg"><Beef className="text-orange-500 w-6 h-6"/></div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white leading-tight">{item.name}</h3>
                                <p className="text-[10px] text-gray-400 font-bold">{t('supplies.cost')}: {costKg.toFixed(2)} {t('common.currency')} / {t('supplies.kg')}</p>
                            </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex justify-between items-center mb-3">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">{t('supplies.available')}</p>
                                <p className={`text-2xl font-black ${stockKg <= alertKg ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                                    {stockKg.toFixed(2)} <span className="text-sm font-normal text-gray-400">{t('supplies.kgShort')}</span>
                                </p>
                            </div>
                            {stockKg <= alertKg && <AlertTriangle className="text-red-500 animate-pulse"/>}
                        </div>

                        <button onClick={() => handleOpenStock(item, 'raw')} className="w-full py-2.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-transform active:scale-95">
                            <ShoppingCart size={16}/> {t('supplies.restock')}
                        </button>
                    </div>
                );
            })}
          </div>
      )}

      {/* --- TAB 2: REVENTA (Ahora con botón Recargar) --- */}
      {activeTab === 'resale' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resaleProducts.map(item => (
                <div key={item.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg"><Box className="text-blue-500 w-6 h-6"/></div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white capitalize">{item.name}</h3>
                                <p className="text-[10px] text-gray-400 font-bold">{t('supplies.buy')}: {item.purchase_price} {t('common.currency')} | {t('supplies.sale')}: {item.price} {t('common.currency')}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">{t('supplies.stockUnits')}</p>
                            <div className="flex justify-between items-end">
                                <p className="text-2xl font-black text-blue-600">{item.stock}</p>
                                {item.stock < 5 && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">{t('supplies.lowStock')}</span>}
                            </div>
                        </div>
                    </div>

                    {/* NUEVO BOTÓN PARA REVENTA */}
                    <button 
                        onClick={() => handleOpenStock(item, 'resale')} 
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-transform active:scale-95"
                    >
                        <ArrowUpCircle size={16}/> {t('supplies.reloadAdd')}
                    </button>
                </div>
            ))}
          </div>
      )}

      {/* --- MODAL CREAR / EDITAR (MATERIA PRIMA) --- */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={editingItem ? t('supplies.editSupply') : t('supplies.newRawMaterialModal')}>
        <form onSubmit={handleSaveRaw} className="space-y-4">
            {/* ... Campos del formulario sin cambios ... */}
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('supplies.name')}</label>
                    <input type="text" className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.name} onChange={e=>setFormCreate({...formCreate, name:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('supplies.costPerKilo')}</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.cost_per_kilo} onChange={e=>setFormCreate({...formCreate, cost_per_kilo:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('supplies.currentStockKg')}</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.current_stock_kilo} onChange={e=>setFormCreate({...formCreate, current_stock_kilo:e.target.value})}/>
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-red-500 uppercase">{t('supplies.minAlertKg')}</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border-2 border-red-100 bg-red-50 rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.min_stock_kilo} onChange={e=>setFormCreate({...formCreate, min_stock_kilo:e.target.value})}/>
                </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin"/> : (editingItem ? t('supplies.saveChanges') : t('supplies.registerSupply'))}
            </button>
        </form>
      </Modal>

      {/* --- MODAL REPOSICIÓN (DINÁMICO) --- */}
      <Modal isOpen={isStockOpen} onClose={() => setIsStockOpen(false)} title={`${t('supplies.restock')}: ${selectedItem?.name}`}>
        <form onSubmit={handleAddStock} className="space-y-4">
            
            {/* MENSAJE DE AYUDA SEGÚN TIPO */}
            <div className="bg-gray-100 p-3 rounded-xl text-xs text-gray-500 mb-2">
                {selectedItem?.type === 'raw' 
                    ? t('supplies.addKilosToKitchen')
                    : t('supplies.addUnitsToResale')
                }
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    {/* ETIQUETA DINÁMICA */}
                    <label className="text-xs font-bold text-gray-500 uppercase">
                        {selectedItem?.type === 'raw' ? t('supplies.addKg') : t('supplies.addUnits')}
                    </label>
                    <input 
                        type="number" 
                        step={selectedItem?.type === 'raw' ? "0.01" : "1"} 
                        min="0" 
                        className="input-base w-full p-3 border rounded-xl font-bold text-lg dark:bg-gray-800 dark:text-white" 
                        autoFocus 
                        required 
                        value={formStock.quantity} 
                        onChange={e=>setFormStock({...formStock, quantity:e.target.value})}
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">
                        {selectedItem?.type === 'raw' ? t('supplies.costBsKg') : t('supplies.purchaseCostBsUnit')}
                    </label>
                    <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                        required 
                        value={formStock.new_cost} 
                        onChange={e=>setFormStock({...formStock, new_cost:e.target.value})}
                    />
                </div>
            </div>
            <button 
                type="submit" 
                disabled={isSubmitting} 
                className={`w-full py-3 text-white font-bold rounded-xl flex justify-center items-center gap-2 ${selectedItem?.type === 'raw' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isSubmitting ? <Loader2 className="animate-spin"/> : t('supplies.confirmPurchase')}
            </button>
        </form>
      </Modal>
    </div>
  );
};

export default Supplies;