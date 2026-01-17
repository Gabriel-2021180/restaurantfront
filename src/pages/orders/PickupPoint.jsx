import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import api from '../../api/axios';
import orderService from '../../services/orderService'; // <--- IMPORTAR SERVICIO
import { 
    Search, ShoppingBag, Trash2, User, Phone, 
    ChevronRight, Plus, Minus, Loader2, DollarSign, Package, Clock, CheckCircle
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';

const PickupPoint = () => {
  const { t } = useTranslation();
  const { products, isLoading: loadingProducts } = useProducts();
  const { categories } = useCategories();

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'active'
  const [activeOrders, setActiveOrders] = useState([]); // Lista de pedidos en curso
  const [loadingOrders, setLoadingOrders] = useState(false);

  // --- ESTADO NUEVO PEDIDO (Persistente) ---
  const [clientName, setClientName] = useState(() => localStorage.getItem('pickup_clientName') || '');
  const [clientPhone, setClientPhone] = useState(() => localStorage.getItem('pickup_clientPhone') || '');
  const [cart, setCart] = useState(() => {
      const saved = localStorage.getItem('pickup_cart');
      return saved ? JSON.parse(saved) : [];
  });

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- EFECTOS ---
  useEffect(() => { localStorage.setItem('pickup_clientName', clientName); }, [clientName]);
  useEffect(() => { localStorage.setItem('pickup_clientPhone', clientPhone); }, [clientPhone]);
  useEffect(() => { localStorage.setItem('pickup_cart', JSON.stringify(cart)); }, [cart]);

  // Cargar pedidos activos al cambiar de pestaña
  useEffect(() => {
      if (activeTab === 'active') {
          fetchActiveOrders();
      }
  }, [activeTab]);

  const fetchActiveOrders = async () => {
      setLoadingOrders(true);
      try {
          const data = await orderService.getActivePickups();
          setActiveOrders(data);
      } catch (error) {
          console.error(error);
      } finally {
          setLoadingOrders(false);
      }
  };

  // Sincronizar stock modal
  useEffect(() => {
      if (selectedProduct && isModalOpen) {
          const fresh = products.find(p => p.id === selectedProduct.id);
          if (fresh && fresh.stock !== selectedProduct.stock) {
              setSelectedProduct(fresh);
          }
      }
  }, [products, selectedProduct, isModalOpen]);

  const filteredProducts = useMemo(() => products.filter(p => {
    if (!p.is_active) return false;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory || p.category?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [products, searchTerm, selectedCategory]);

  const totalAmount = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);

  // --- ACCIONES ---

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setQty(1);
    setNotes('');
    setIsModalOpen(true);
  };

  const addToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (selectedProduct.track_stock) {
        const inCart = cart.find(x => x.id === selectedProduct.id)?.quantity || 0;
        if ((qty + inCart) > selectedProduct.stock) {
            toast.error(`Stock insuficiente. Quedan ${selectedProduct.stock}.`);
            return;
        }
    }

    const newItem = {
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: parseFloat(selectedProduct.price),
        quantity: qty,
        notes: notes,
    };

    setCart(prev => {
        const existingIndex = prev.findIndex(item => item.id === newItem.id && item.notes === newItem.notes);
        if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex].quantity += newItem.quantity;
            return updated;
        }
        return [...prev, newItem];
    });

    setIsModalOpen(false);
    toast.success('Agregado');
  };

  const handleCreateOrder = async () => {
      if (!clientName.trim()) {
          toast.error('Falta nombre del cliente');
          return;
      }
      if (cart.length === 0) {
          toast.error('Carrito vacío');
          return;
      }

      setIsSubmitting(true);
      try {
          const payload = {
              client_name: clientName,
              client_phone: clientPhone,
              items: cart.map(item => ({
                  product_id: item.id,
                  quantity: item.quantity,
                  notes: item.notes
              }))
          };

          await api.post('/orders/pickup', payload);
          
          setCart([]);
          setClientName('');
          setClientPhone('');
          localStorage.removeItem('pickup_cart');
          localStorage.removeItem('pickup_clientName');
          localStorage.removeItem('pickup_clientPhone');

          Swal.fire({
              icon: 'success',
              title: '¡Pedido Enviado!',
              text: 'Se ha enviado a cocina.',
              timer: 1500,
              showConfirmButton: false
          });
          
          setActiveTab('active'); // Cambiamos a la pestaña de activos para ver el pedido

      } catch (error) {
          const msg = error.response?.data?.message || 'Error al crear pedido';
          Swal.fire('Error', msg, 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  // 🔥 NUEVO: ENVIAR A CAJA (COBRAR)
  const handleSendToCashier = async (orderId) => {
      try {
          await Swal.fire({
              title: '¿Enviar a Caja?',
              text: "El pedido pasará a 'Pendiente de Pago' para que el cajero lo cobre.",
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Sí, enviar',
              cancelButtonText: 'Cancelar'
          }).then(async (result) => {
              if (result.isConfirmed) {
                  await orderService.sendToCashier(orderId);
                  toast.success('Enviado a Caja');
                  fetchActiveOrders(); // Refrescar lista
              }
          });
      } catch (error) {
          toast.error('Error al procesar');
      }
  };

  if (loadingProducts) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-dark-bg animate-fade-in overflow-hidden">
      <Toaster position="top-center" />

      {/* HEADER PRINCIPAL */}
      <div className="h-16 bg-white dark:bg-dark-card border-b dark:border-gray-700 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <Package className="text-primary"/> {t('orderManager.takeAway')}
          </h2>
          
          {/* PESTAÑAS */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button 
                  onClick={() => setActiveTab('new')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-white dark:bg-dark-card shadow text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                  <Plus size={16} className="inline mr-2 mb-0.5"/> {t('orderManager.newOrderButton')}
              </button>
              <button 
                  onClick={() => setActiveTab('active')}
                  className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white dark:bg-dark-card shadow text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                  <Clock size={16} className="inline mr-2 mb-0.5"/> {t('orderManager.activeOrdersButton')}
              </button>
          </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {activeTab === 'new' ? (
          <div className="flex flex-1 overflow-hidden">
              {/* IZQUIERDA: CATÁLOGO */}
              <div className="flex-1 flex flex-col border-r dark:border-gray-700">
                  {/* Buscador y Categorías */}
                  <div className="bg-white dark:bg-dark-card border-b dark:border-gray-700 p-4 space-y-4 shadow-sm z-10">
                      <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                          <input 
                            type="text" 
                            placeholder={t('orderManager.searchPlaceholder')}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setSelectedCategory('ALL')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'ALL' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{t('orderManager.all')}</button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{cat.name}</button>
                        ))}
                      </div>
                  </div>

                  {/* Grid Productos */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filteredProducts.map(product => (
                              <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white dark:bg-dark-card p-3 rounded-2xl shadow-sm hover:ring-2 ring-primary/50 cursor-pointer active:scale-95 transition-all flex flex-col h-40 justify-between group relative overflow-hidden">
                                  {product.track_stock && (
                                      <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                          {product.stock} u.
                                      </div>
                                  )}
                                  <div>
                                      <p className="font-bold text-gray-800 dark:text-white line-clamp-2 leading-tight">{product.name}</p>
                                  </div>
                                  <div className="flex justify-between items-end">
                                       <span className="font-black text-lg text-primary">{parseFloat(product.price).toFixed(2)}</span>
                                       <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><Plus size={18} /></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              {/* DERECHA: CARRITO */}
              <div className="w-full lg:w-96 bg-white dark:bg-dark-card shadow-2xl flex flex-col z-20 shrink-0 border-l dark:border-gray-700">
                  {/* Formulario Cliente */}
                  <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                      <div className="relative">
                          <User className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                          <input 
                            id="clientNameInput"
                            type="text" 
                            placeholder={t('orderManager.clientNamePlaceholder')} 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                          />
                      </div>
                      <div className="relative">
                          <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                          <input 
                            type="text" 
                            placeholder={t('orderManager.clientPhonePlaceholder')} // <--- TRADUCIDO
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none text-sm"
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                          />
                      </div>
                  </div>

                  {/* Lista Items */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {cart.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50 gap-2">
                              <ShoppingBag size={48} strokeWidth={1}/>
                              <p className="text-sm">Carrito vacío</p>
                          </div>
                      ) : (
                          cart.map((item, idx) => (
                              <div key={idx} className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm animate-fade-in-up">
                                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg font-bold text-sm">
                                      {item.quantity}
                                  </div>
                                  <div className="flex-1">
                                      <div className="flex justify-between">
                                          <p className="font-bold text-sm dark:text-white line-clamp-1">{item.name}</p>
                                          <p className="font-mono text-sm font-bold text-gray-600 dark:text-gray-300">{(item.price * item.quantity).toFixed(2)}</p>
                                      </div>
                                      {item.notes && <p className="text-[10px] text-gray-500 italic mt-0.5">{item.notes}</p>}
                                  </div>
                                  <button onClick={() => {
                                      setCart(prev => prev.filter((_, i) => i !== idx));
                                  }} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                              </div>
                          ))
                      )}
                  </div>

                  {/* Footer */}
                  <div className="p-6 bg-white dark:bg-dark-card border-t dark:border-gray-700 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">{t('orderManager.total')}</span>
                          <span className="text-3xl font-black text-gray-800 dark:text-white">{t('common.currency')}{totalAmount.toFixed(2)}</span>
                      </div>
                      
                      <button 
                          onClick={handleCreateOrder}
                          disabled={isSubmitting || cart.length === 0}
                          className={`w-full py-4 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 text-lg transition-all active:scale-95 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black dark:bg-primary dark:hover:bg-primary-dark'}`}
                      >
                          {isSubmitting ? <Loader2 className="animate-spin"/> : <><DollarSign size={20} strokeWidth={3}/> {t('orderManager.confirmOrder')}</>}
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          // VISTA DE PEDIDOS ACTIVOS
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-dark-bg">
              {loadingOrders ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>
              ) : activeOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Package size={64} className="mb-4 opacity-20"/>
                      <p className="text-lg font-medium">No hay pedidos activos para llevar.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {activeOrders.map(order => (
                          <div key={order.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col animate-fade-in-up">
                              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-start">
                                  <div>
                                      <h3 className="font-black text-lg text-gray-800 dark:text-white">{order.client_name}</h3>
                                      <p className="text-xs text-gray-500 font-mono">#{order.order_number}</p>
                                  </div>
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-lg uppercase">
                                      {order.status === 'pending' ? 'En Cocina' : order.status}
                                  </span>
                              </div>
                              
                              <div className="p-4 flex-1 space-y-2">
                                  {order.details.map((item, i) => (
                                      <div key={i} className="flex justify-between text-sm">
                                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                                              <span className="font-bold mr-1">{item.quantity}x</span> {item.product.name}
                                          </span>
                                      </div>
                                  ))}
                              </div>

                              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex items-center justify-between">
                                  <span className="font-black text-xl text-gray-800 dark:text-white">
                                      {parseFloat(order.total).toFixed(2)} Bs
                                  </span>
                                  <button 
                                      onClick={() => handleSendToCashier(order.id)}
                                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-sm text-xs flex items-center gap-1 transition-transform active:scale-95"
                                  >
                                      <CheckCircle size={14}/> Enviar a Caja
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* MODAL AGREGAR (Mismo código de antes) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct?.name || 'Producto'}>
        <form onSubmit={addToCart} className="space-y-6">
            <div className="text-center space-y-1">
                <p className="text-4xl font-black text-primary">
                    {t('common.currency')}{selectedProduct ? parseFloat(selectedProduct.price).toFixed(2) : '0.00'}
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
                    <button type="button" onClick={() => qty > 1 && setQty(qty - 1)} className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-gray-600 dark:text-white transition active:scale-90">
                        <Minus size={28} strokeWidth={3}/>
                    </button>
                    <input 
                        type="number" 
                        className="w-24 text-center text-4xl font-black bg-transparent dark:text-white border-none outline-none" 
                        value={qty} 
                        onChange={e => {
                            const val = parseInt(e.target.value);
                            if (selectedProduct?.track_stock && val > selectedProduct.stock) return;
                            setQty(val);
                        }} 
                    />
                    <button type="button" onClick={() => {
                        if (selectedProduct?.track_stock) {
                            const inCart = cart.find(x => x.id === selectedProduct.id)?.quantity || 0;
                            if ((qty + inCart) >= selectedProduct.stock) return toast.error('Tope de stock');
                        }
                        setQty(qty + 1);
                    }} className="w-16 h-16 rounded-2xl bg-primary hover:bg-primary-dark text-white shadow-lg flex items-center justify-center transition active:scale-95">
                        <Plus size={28} strokeWidth={3}/>
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold mb-2 dark:text-white">{t('orderManager.notes')}</label>
                <textarea rows="2" className="w-full p-4 border rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="Sin cebolla, extra salsa..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl text-lg mt-4 active:scale-95 transition">
                {t('orderManager.confirm')}
            </button>
        </form>
      </Modal>
    </div>
  );
};

export default PickupPoint;