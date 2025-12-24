import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query'; // <--- 1. IMPORTAR ESTO
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, Search, ShoppingBag, Trash2, Plus, CheckCircle, DollarSign, Loader2, ChefHat } from 'lucide-react';
import Swal from 'sweetalert2';

const OrderManager = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // <--- 2. INICIALIZAR EL CLIENTE
  
  const { order, isLoading, addItem, removeItem, sendToCashier, sendToKitchen, isSyncing } = useOrders(orderId);
  const { products } = useProducts();
  const { categories } = useCategories();

  // ... (Tus estados: selectedCategory, searchTerm, etc. MANTENLOS IGUAL) ...
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQty(1);
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAdd = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsAddModalOpen(false);
    await addItem({ product_id: selectedProduct.id, quantity: parseInt(qty) || 1, notes: notes }, selectedProduct);
    setQty(1);
    setNotes('');
  };

  const handleDeleteItem = (itemId) => {
    removeItem(itemId);
  };

  const handleSendToKitchen = async () => {
    Swal.fire({ title: 'Enviando...', didOpen: () => Swal.showLoading() });
    try {
        const result = await sendToKitchen();
        if (result) {
            Swal.fire({ title: '¡Enviado!', text: 'La comanda está en cocina.', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
            Swal.close();
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo enviar', 'error');
    }
  };

  // --- AQUÍ ESTÁ EL ARREGLO IMPORTANTE ---
  const handleProcessPayment = async () => {
    if (!order) return;
    
    const result = await Swal.fire({
        title: '¿Cerrar Mesa?', text: "La mesa quedará libre y la cuenta pasará a Caja.", icon: 'warning',
        showCancelButton: true, confirmButtonText: 'Sí, liberar', cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
        
        try {
            await sendToCashier(order.id);
            
            // 3. ¡EL TRUCO! OBLIGAMOS A RECARGAR LAS MESAS
            // Así cuando vuelvas a la pantalla de mesas, pedirá datos nuevos sí o sí.
            await queryClient.invalidateQueries(['tables']);

            await Swal.fire({
                title: 'Mesa Liberada',
                text: 'Pasa a Caja para emitir la factura.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            navigate('/tables');
            
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo procesar el cierre.', 'error');
        }
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-dark-bg overflow-hidden">
      
      {/* ... (Todo tu JSX visual SIGUE IGUAL, no cambies nada visual) ... */}
      <div className="flex-1 flex flex-col border-r dark:border-gray-700">
         <div className="h-16 bg-white dark:bg-dark-card border-b dark:border-gray-700 flex items-center px-4 gap-4 shadow-sm z-10">
            <Link to="/tables" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 transition">
                <ArrowLeft size={20} className="text-gray-600 dark:text-white"/>
            </Link>
            <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Mesa {order?.table?.table_number}</h2>
                <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">#{order?.order_number}</span>
            </div>
            <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar..." className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
        </div>

        <div className="h-14 bg-white dark:bg-dark-card border-b dark:border-gray-700 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setSelectedCategory('ALL')} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${selectedCategory === 'ALL' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>Todo</button>
            {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{cat.name}</button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white dark:bg-dark-card p-3 rounded-2xl shadow-sm hover:border-primary border border-transparent cursor-pointer active:scale-95 transition-all flex flex-col h-40 justify-between group">
                        <span className="bg-gray-100 dark:bg-gray-700 text-xs font-bold px-2 py-1 rounded text-gray-500 dark:text-gray-300 w-max">{product.category?.name?.substring(0, 10) || 'Gral'}</span>
                        <p className="font-bold text-gray-800 dark:text-white line-clamp-2">{product.name}</p>
                        <div className="flex justify-between items-end">
                             <span className="font-black text-lg text-primary">${parseFloat(product.price).toFixed(2)}</span>
                             <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow group-hover:bg-primary-dark"><Plus size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <div className="w-96 bg-white dark:bg-dark-card shadow-xl flex flex-col z-20">
        <div className="h-16 border-b dark:border-gray-700 flex items-center px-6 bg-gray-50 dark:bg-gray-800">
            <ShoppingBag className="text-primary mr-3" />
            <h3 className="font-bold text-lg dark:text-white">Pedido Actual</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {order?.details?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50"><p>Selecciona productos...</p></div>
            ) : (
                order?.details?.map((item) => (
                    <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${item.isTemp ? 'bg-yellow-50 border-yellow-200 opacity-70' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                        <div className="w-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-lg font-bold border">{item.quantity}x</div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <p className="font-bold text-sm dark:text-white">{item.product.name}</p>
                                <p className="font-mono text-sm font-bold text-gray-600 dark:text-gray-300">
                                    ${(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                                </p>
                            </div>
                            {item.notes && <p className="text-xs text-green-600 bg-green-50 px-1 rounded inline-block">{item.notes}</p>}
                            {item.isTemp && <span className="text-[10px] text-yellow-600 font-bold ml-1 flex items-center gap-1"><Loader2 className="animate-spin w-3 h-3"/> Guardando...</span>}
                        </div>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))
            )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 dark:text-gray-400">Total Acumulado</span>
                <span className="text-3xl font-black text-gray-800 dark:text-white">${parseFloat(order?.total || 0).toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col gap-3">
                <button 
                    onClick={handleSendToKitchen} 
                    disabled={isSyncing} 
                    className={`w-full py-3 text-white font-bold rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center gap-2 ${isSyncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-800 hover:bg-black'}`}
                >
                    {isSyncing ? 'Guardando...' : <><ChefHat size={20} /> Marchar a Cocina</>}
                </button>

                <button onClick={handleProcessPayment} className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow transition-transform active:scale-95 flex items-center justify-center gap-2">
                    <DollarSign size={20} /> Cobrar Cuenta
                </button>
            </div>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agregar Producto">
        <form onSubmit={handleConfirmAdd} className="space-y-4">
            <div className="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-xl"><span className="text-4xl font-black text-primary">${selectedProduct?.price}</span></div>
            <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-bold mb-1 dark:text-white">Cant.</label><input type="number" min="1" autoFocus className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white text-center font-bold" value={qty} onChange={e => setQty(e.target.value)} /></div>
                <div className="col-span-2"><label className="block text-sm font-bold mb-1 dark:text-white">Notas</label><textarea rows="1" className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" value={notes} onChange={e => setNotes(e.target.value)} /></div>
            </div>
            <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg mt-4">Confirmar</button>
        </form>
      </Modal>

    </div>
  );
};

export default OrderManager;