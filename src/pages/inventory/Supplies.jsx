import { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useProducts } from '../../hooks/useProducts';
import Modal from '../../components/ui/Modal';
import { Plus, Package, ShoppingCart, Loader2, Beef, Box, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

const Supplies = () => {
  const { supplies, isLoading: loadingSupplies, createSupply, addStock, updateSupply, deleteSupply } = useInventory();
  const { products, isLoading: loadingProducts } = useProducts();
  
  // Tabs
  const [activeTab, setActiveTab] = useState('raw');
  
  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  
  // Estado para Edición
  const [editingItem, setEditingItem] = useState(null); // Si existe, el modal Crear funciona como Editar
  
  const [selectedItem, setSelectedItem] = useState(null); // Para el modal de "Agregar Stock"
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formularios
  const [formCreate, setFormCreate] = useState({ name: '', cost_per_kilo: '', current_stock_kilo: '', min_stock_kilo: '' });
  const [formStock, setFormStock] = useState({ quantity_kilo: '', new_cost_kilo: '' });

  const rawMaterials = supplies; 
  const resaleProducts = products.filter(p => p.track_stock === true);

  // --- ABRIR MODAL CREAR / EDITAR ---
  const handleOpenCreate = () => {
      setEditingItem(null);
      setFormCreate({ name: '', cost_per_kilo: '', current_stock_kilo: '', min_stock_kilo: '' });
      setIsCreateOpen(true);
  };

  const handleOpenEdit = (item) => {
      setEditingItem(item);
      // TRADUCCIÓN: Convertimos lo que viene de BD (Gramos/CostoGramo) a Humano (Kilos/CostoKilo)
      setFormCreate({
          name: item.name,
          cost_per_kilo: (item.cost_per_unit * 1000).toFixed(2), // 0.04 Bs/gr -> 40 Bs/Kg
          current_stock_kilo: (item.current_stock / 1000).toFixed(2), // 5000 gr -> 5 Kg
          min_stock_kilo: (item.min_stock_alert / 1000).toFixed(2)
      });
      setIsCreateOpen(true);
  };

  const handleDelete = (id) => {
      Swal.fire({
          title: '¿Eliminar insumo?',
          text: "Esto puede afectar las recetas que lo usan.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Sí, borrar'
      }).then((r) => { if(r.isConfirmed) deleteSupply(id) });
  };

  // --- GUARDAR (CREAR O EDITAR) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        const costPerKilo = parseFloat(formCreate.cost_per_kilo);
        const stockEnKilos = parseFloat(formCreate.current_stock_kilo);
        const minStockEnKilos = parseFloat(formCreate.min_stock_kilo);

        if (isNaN(costPerKilo) || isNaN(stockEnKilos)) throw new Error("Datos numéricos inválidos");

        // TRADUCCIÓN INVERSA: Humano (Kilos) -> BD (Gramos)
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
    } catch (error) {
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- COMPRAR STOCK ---
  const handleOpenStock = (item, type) => {
    setSelectedItem({ ...item, type });
    // Sugerimos el costo actual (convertido a Kilo)
    const currentCostKilo = type === 'raw' ? (item.cost_per_unit * 1000).toFixed(2) : item.purchase_price;
    setFormStock({ quantity_kilo: '', new_cost_kilo: currentCostKilo });
    setIsStockOpen(true);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const qty = parseFloat(formStock.quantity_kilo);
        const cost = parseFloat(formStock.new_cost_kilo);

        if (selectedItem.type === 'raw') {
            await addStock({
                id: selectedItem.id,
                data: { quantity: qty * 1000, new_cost: cost / 1000 } // Kilos -> Gramos
            });
        }
        setIsStockOpen(false);
    } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
  };

  if (loadingSupplies || loadingProducts) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                <Package className="text-orange-500"/> Inventario (Almacén)
            </h2>
            <div className="flex gap-2 mt-2">
                <button onClick={() => setActiveTab('raw')} className={`px-3 py-1 rounded-lg text-sm font-bold transition ${activeTab === 'raw' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}>🥩 Materia Prima</button>
                <button onClick={() => setActiveTab('resale')} className={`px-3 py-1 rounded-lg text-sm font-bold transition ${activeTab === 'resale' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>🥤 Reventa</button>
            </div>
        </div>
        {activeTab === 'raw' && (
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition active:scale-95">
                <Plus size={18} /> Nueva Materia Prima
            </button>
        )}
      </div>

      {/* LISTA MATERIA PRIMA */}
      {activeTab === 'raw' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rawMaterials.map(item => {
                // LÓGICA VISUAL: MOSTRAR KILOS, NO GRAMOS
                // Si la BD dice 20000 (gr), mostramos 20 (Kg)
                const stockKg = item.current_stock / 1000;
                const costKg = item.cost_per_unit * 1000; 
                const alertKg = item.min_stock_alert / 1000;

                return (
                    <div key={item.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        
                        {/* Botones Flotantes (Editar / Eliminar) */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenEdit(item)} className="p-1.5 bg-gray-100 hover:bg-blue-100 text-blue-600 rounded-lg"><Pencil size={14}/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-gray-100 hover:bg-red-100 text-red-600 rounded-lg"><Trash2 size={14}/></button>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-50 rounded-lg"><Beef className="text-orange-500 w-6 h-6"/></div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white leading-tight">{item.name}</h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">COSTO: {costKg.toFixed(2)} Bs / Kg</p>
                            </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex justify-between items-center mb-3">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Disponible</p>
                                <p className={`text-2xl font-black ${stockKg <= alertKg ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                                    {stockKg.toFixed(2)} <span className="text-sm font-normal text-gray-400">Kg</span>
                                </p>
                            </div>
                            {stockKg <= alertKg && <AlertTriangle className="text-red-500 animate-pulse"/>}
                        </div>

                        <button onClick={() => handleOpenStock(item, 'raw')} className="w-full py-2.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-transform active:scale-95">
                            <ShoppingCart size={16}/> Reponer Stock
                        </button>
                    </div>
                );
            })}
          </div>
      )}

      {/* LISTA REVENTA (Solo visualización) */}
      {activeTab === 'resale' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resaleProducts.map(item => (
                <div key={item.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg"><Box className="text-blue-500 w-6 h-6"/></div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white">{item.name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold">COMPRA: {item.purchase_price} Bs | VENTA: {item.price} Bs</p>
                        </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Stock Unidades</p>
                        <p className="text-2xl font-black text-blue-600">{item.stock}</p>
                    </div>
                </div>
            ))}
          </div>
      )}

      {/* MODAL CREAR / EDITAR (Siempre en KILOS) */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={editingItem ? "Editar Insumo" : "Nueva Materia Prima"}>
        <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                    <input type="text" className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.name} onChange={e=>setFormCreate({...formCreate, name:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Costo por Kilo ($)</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.cost_per_kilo} onChange={e=>setFormCreate({...formCreate, cost_per_kilo:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Stock Actual (Kg)</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.current_stock_kilo} onChange={e=>setFormCreate({...formCreate, current_stock_kilo:e.target.value})}/>
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-bold text-red-500 uppercase">Alerta Mínima (Kg)</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border-2 border-red-100 bg-red-50 rounded-xl dark:bg-gray-800 dark:text-white" required value={formCreate.min_stock_kilo} onChange={e=>setFormCreate({...formCreate, min_stock_kilo:e.target.value})}/>
                </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin"/> : (editingItem ? 'Guardar Cambios' : 'Registrar Insumo')}
            </button>
        </form>
      </Modal>

      {/* MODAL COMPRA */}
      <Modal isOpen={isStockOpen} onClose={() => setIsStockOpen(false)} title={`Reponer: ${selectedItem?.name}`}>
        <form onSubmit={handleAddStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Sumar (Kg)</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border rounded-xl font-bold text-lg" autoFocus required value={formStock.quantity_kilo} onChange={e=>setFormStock({...formStock, quantity_kilo:e.target.value})}/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nuevo Costo (Bs/Kg)</label>
                    <input type="number" step="0.01" min="0" className="input-base w-full p-3 border rounded-xl" required value={formStock.new_cost_kilo} onChange={e=>setFormStock({...formStock, new_cost_kilo:e.target.value})}/>
                </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin"/> : 'Confirmar Compra'}
            </button>
        </form>
      </Modal>
    </div>
  );
};

export default Supplies;