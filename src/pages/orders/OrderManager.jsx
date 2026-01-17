import { useState,useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query'; 
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import Modal from '../../components/ui/Modal';
import { Toaster } from 'react-hot-toast';
import { ArrowLeft, Search, ShoppingBag, Trash2, Plus, DollarSign, Loader2, ChefHat, Minus } from 'lucide-react';
import Swal from 'sweetalert2';
import { useSocket } from '../../context/SocketContext';

const OrderManager = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient(); 
  const { socket } = useSocket();
  
  // Traemos isSyncing (que nos dice si se está agregando algo)
  const { order, isLoading, addItem, removeItem, sendToCashier, sendToKitchen, isSyncing } = useOrders(orderId);
  
  const { products } = useProducts();
  const { categories } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
        selectedCategory === 'ALL' || 
        p.category_id === selectedCategory || 
        p.category?.id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product) => {
    // 🔥 Si estamos sincronizando, bloqueamos clicks en productos
    if (isSyncing) return;

    setSelectedProduct(product);
    setQty(1);
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAdd = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setIsAddModalOpen(false);
    
    const validQty = parseInt(qty);
    const finalQty = (!validQty || validQty < 1) ? 1 : validQty;

    // 🔥 CORRECCIÓN TÉCNICA: Pasamos UN SOLO objeto con todo
    addItem({ 
        product_id: selectedProduct.id, 
        quantity: finalQty, 
        notes: notes 
    });

    setQty(1);
    setNotes('');
  };

  const handleDeleteItem = (itemId) => {
    if (isSyncing) return; 
    removeItem(itemId);
  };
  
  // ... (Resto de funciones auxiliares iguales) ...
  const handleIncreaseQty = () => { if(!selectedProduct) return; const current = parseInt(qty)||0; if(selectedProduct.track_stock && current >= selectedProduct.stock) return; setQty(current+1); };
  const handleDecreaseQty = () => { const current = parseInt(qty)||1; if(current>1) setQty(current-1); };
  
  const handleSendToKitchen = async () => {
    if (isSyncing) return;
    Swal.fire({ title: t('orderManager.sending'), didOpen: () => Swal.showLoading() });
    try {
        const result = await sendToKitchen();
        if (result) Swal.fire({ title: t('orderManager.sent'), text: t('orderManager.orderInKitchen'), icon: 'success', timer: 1000, showConfirmButton: false });
        else Swal.close();
    } catch (error) { Swal.fire(t('orderManager.error'), t('orderManager.couldNotSend'), 'error'); }
  };

  const handleProcessPayment = async () => {
    if (!order || isSyncing) return;
    const result = await Swal.fire({ title: t('orderManager.releaseTable'), text: t('orderManager.accountGoesToCashier'), icon: 'warning', showCancelButton: true, confirmButtonText: t('orderManager.yesRelease'), confirmButtonColor: '#10b981', cancelButtonText: t('orderManager.cancel') });
    if (result.isConfirmed) {
        navigate('/tables');
        try { await sendToCashier(order.id); await queryClient.invalidateQueries(['tables']); } catch (error) { console.error(error); }
    }
  };

  // Efecto para actualizar stock en tiempo real en el modal
  useEffect(() => {
    if (selectedProduct && isAddModalOpen) {
        const freshProduct = products.find(p => p.id === selectedProduct.id);
        if (freshProduct && freshProduct.stock !== selectedProduct.stock) setSelectedProduct(freshProduct);
    }
  }, [products, selectedProduct, isAddModalOpen]);

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen bg-gray-100 dark:bg-dark-bg lg:overflow-hidden">
      <Toaster position="top-center" /> 
      
      {/* IZQUIERDA: MENÚ */}
      <div className="flex-1 flex flex-col border-r dark:border-gray-700 relative">
         
         {/* 🔥 YA NO HAY LOADER FEO QUE TAPA TODO 🔥 */}
         
         <div className="h-16 bg-white dark:bg-dark-card border-b dark:border-gray-700 flex items-center px-4 gap-4 shadow-sm z-10 shrink-0">
            <Link to="/tables" className={`p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 transition ${isSyncing ? 'pointer-events-none opacity-50' : ''}`}>
                <ArrowLeft size={20} className="text-gray-600 dark:text-white"/>
            </Link>
            <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('orderManager.table')} {order?.table?.table_number}</h2>
                <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">#{order?.order_number}</span>
            </div>
            <div className="relative hidden md:block w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input type="text" placeholder={t('orderManager.searchPlaceholder')} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={isSyncing}/>
            </div>
        </div>

        <div className="h-14 bg-white dark:bg-dark-card border-b dark:border-gray-700 flex items-center px-4 gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button onClick={() => setSelectedCategory('ALL')} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${selectedCategory === 'ALL' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{t('orderManager.all')}</button>
            {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{cat.name}</button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg">
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity duration-300 ${isSyncing ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                {/* 🔥 Al agregar, la grilla se pone semi-transparente y bloqueada */}
                {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white dark:bg-dark-card p-3 rounded-2xl shadow-sm hover:border-primary border border-transparent cursor-pointer active:scale-95 transition-all flex flex-col h-40 justify-between group">
                        <span className="bg-gray-100 dark:bg-gray-700 text-xs font-bold px-2 py-1 rounded text-gray-500 dark:text-gray-300 w-max">{product.category?.name?.substring(0, 10) || t('orderManager.general')}</span>
                        <p className="font-bold text-gray-800 dark:text-white line-clamp-2">{product.name}</p>
                        <div className="flex justify-between items-end">
                             <span className="font-black text-lg text-primary">{t('common.currency')}{parseFloat(product.price).toFixed(2)}</span>
                             <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow group-hover:bg-primary-dark"><Plus size={18} /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* DERECHA: RESUMEN */}
      <div className="w-full lg:w-96 lg:h-full bg-white dark:bg-dark-card shadow-2xl lg:shadow-xl flex flex-col z-20 shrink-0">
        <div className="h-16 border-b dark:border-gray-700 flex items-center px-6 bg-gray-50 dark:bg-gray-800 shrink-0">
            <ShoppingBag className="text-primary mr-3" />
            <h3 className="font-bold text-lg dark:text-white">{t('orderManager.currentOrder')}</h3>
            {/* Pequeño indicador de carga solo aquí */}
            {isSyncing && <Loader2 className="ml-auto w-5 h-5 text-primary animate-spin"/>}
        </div>

        <div className={`flex-1 overflow-y-auto p-4 space-y-3 transition-opacity ${isSyncing ? 'opacity-60 pointer-events-none' : ''}`}>
            {order?.details?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50"><p>{t('orderManager.selectProducts')}</p></div>
            ) : (
                order?.details?.map((item) => {
                    const price = parseFloat(item.price_at_purchase) || 0;
                    const quantity = parseInt(item.quantity) || 1;
                    const subtotal = (price * quantity).toFixed(2);

                    return (
                        <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${item.isTemp ? 'bg-yellow-50 border-yellow-200 opacity-70' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                            <div className="w-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-lg font-bold border">
                                {quantity}x
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="font-bold text-sm dark:text-white">{item.product?.name || 'Item'}</p>
                                    <p className="font-mono text-sm font-bold text-gray-600 dark:text-gray-300">{t('common.currency')}{subtotal}</p>
                                </div>
                                {item.notes && <p className="text-xs text-green-600 bg-green-50 px-1 rounded inline-block">{item.notes}</p>}
                            </div>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </div>
                    );
                })
            )}
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 dark:text-gray-400">{t('orderManager.totalAccumulated')}</span>
                <span className="text-3xl font-black text-gray-800 dark:text-white">{t('common.currency')}{parseFloat(order?.total || 0).toFixed(2)}</span>
            </div>
            
            <div className="flex flex-col gap-3">
                
                {/* 🔥 BOTÓN COMANDAR: SE PONE GRIS SI ESTÁ AGREGANDO */}
                <button 
                    onClick={handleSendToKitchen} 
                    disabled={isSyncing} 
                    className={`w-full py-3 font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 ${
                        isSyncing 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' // Estilo deshabilitado
                        : 'bg-gray-800 text-white hover:bg-black active:scale-95' // Estilo normal
                    }`}
                >
                    {isSyncing ? (
                        <>Procesando...</>
                    ) : (
                        <><ChefHat size={20} /> {t('orderManager.sendToKitchen')}</>
                    )}
                </button>

                {/* 🔥 BOTÓN COBRAR: SE PONE GRIS SI ESTÁ AGREGANDO */}
                <button 
                    onClick={handleProcessPayment} 
                    disabled={isSyncing}
                    className={`w-full py-3 font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 ${
                        isSyncing
                        ? 'bg-green-200 text-white cursor-not-allowed' // Estilo deshabilitado
                        : 'bg-primary text-white hover:bg-primary-dark active:scale-95' // Estilo normal
                    }`}
                >
                    {isSyncing ? (
                        <>Procesando...</>
                    ) : (
                        <><DollarSign size={20} /> {t('orderManager.collectAccount')}</>
                    )}
                </button>
            </div>
        </div>
      </div>
      
      {/* Modal Agregar Producto (Igual que antes) */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={selectedProduct?.name || t('orderManager.addProduct')}>
            <form onSubmit={handleConfirmAdd} className="space-y-6">
                <div className="text-center space-y-1">
                    <p className="text-4xl font-black text-primary">
                        {t('common.currency')}{parseFloat(selectedProduct?.price).toFixed(2)}
                    </p>
                    {selectedProduct?.track_stock && (
                        <p className={`text-xs font-bold uppercase ${selectedProduct.stock < 5 ? 'text-red-500' : 'text-gray-400'}`}>
                            Stock Disponible: {selectedProduct.stock}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-center text-sm font-bold mb-3 text-gray-500 uppercase tracking-widest">
                        {t('orderManager.quantity')}
                    </label>
                    <div className="flex items-center justify-center gap-4">
                        <button type="button" onClick={handleDecreaseQty} className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-gray-600 dark:text-white transition active:scale-90"><Minus size={28} strokeWidth={3}/></button>
                        <input type="number" min="1" max={selectedProduct?.track_stock ? selectedProduct.stock : 999} className="w-24 text-center text-4xl font-black bg-transparent dark:text-white border-none outline-none" value={qty} onChange={e => { const val = parseInt(e.target.value); if (selectedProduct?.track_stock && val > selectedProduct.stock) return; setQty(val); }} />
                        <button type="button" onClick={handleIncreaseQty} className="w-16 h-16 rounded-2xl bg-primary hover:bg-primary-dark text-white shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center transition active:scale-90"><Plus size={28} strokeWidth={3}/></button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold mb-2 dark:text-white">{t('orderManager.notes')}</label>
                    <textarea rows="2" className="w-full p-4 border rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="Sin cebolla, muy cocido..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl text-lg mt-4 active:scale-95 transition">
                    {t('orderManager.confirm')}
                </button>
            </form>
      </Modal>
    </div>
  );
};

export default OrderManager;