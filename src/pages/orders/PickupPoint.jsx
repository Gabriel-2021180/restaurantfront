import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import api from '../../api/axios';
import orderService from '../../services/orderService';
import { 
    Search, ShoppingBag, Trash2, User, Phone, 
    Plus, Minus, Loader2, DollarSign, Package, Clock, CheckCircle
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';

const PickupPoint = () => {
  const { t } = useTranslation();
  const { products, isLoading: loadingProducts } = useProducts();
  const { categories } = useCategories();

  const [activeTab, setActiveTab] = useState('new');
  const [activeOrders, setActiveOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [clientName, setClientName] = useState(() => localStorage.getItem('pickup_clientName') || '');
  const [clientPhone, setClientPhone] = useState(() => localStorage.getItem('pickup_clientPhone') || '');
  const [cart, setCart] = useState(() => {
      const saved = localStorage.getItem('pickup_cart');
      return saved ? JSON.parse(saved) : [];
  });

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { localStorage.setItem('pickup_clientName', clientName); }, [clientName]);
  useEffect(() => { localStorage.setItem('pickup_clientPhone', clientPhone); }, [clientPhone]);
  useEffect(() => { localStorage.setItem('pickup_cart', JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
      if (activeTab === 'active') fetchActiveOrders();
  }, [activeTab]);

  const fetchActiveOrders = async () => {
      setLoadingOrders(true);
      try {
          const data = await orderService.getActivePickups();
          setActiveOrders(data);
      } catch (error) { console.error(error); } finally { setLoadingOrders(false); }
  };

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

    const newItem = { id: selectedProduct.id, name: selectedProduct.name, price: parseFloat(selectedProduct.price), quantity: qty, notes: notes };

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
      if (!clientName.trim()) { toast.error('Falta nombre del cliente'); return; }
      if (cart.length === 0) { toast.error('Carrito vacío'); return; }

      setIsSubmitting(true);
      try {
          const payload = { client_name: clientName, client_phone: clientPhone, items: cart.map(item => ({ product_id: item.id, quantity: item.quantity, notes: item.notes })) };
          await api.post('/orders/pickup', payload);
          setCart([]); setClientName(''); setClientPhone('');
          localStorage.removeItem('pickup_cart'); localStorage.removeItem('pickup_clientName'); localStorage.removeItem('pickup_clientPhone');
          Swal.fire({ icon: 'success', title: '¡Pedido Enviado!', text: 'Se ha enviado a cocina.', timer: 1500, showConfirmButton: false });
          setActiveTab('active');
      } catch (error) {
          const msg = error.response?.data?.message || 'Error al crear pedido';
          Swal.fire('Error', msg, 'error');
      } finally { setIsSubmitting(false); }
  };

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
                  fetchActiveOrders();
              }
          });
      } catch (error) { toast.error('Error al procesar'); }
  };

  if (loadingProducts) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-dark-bg animate-fade-in lg:overflow-hidden">
      <Toaster position="top-center" />

      {/* HEADER: Ahora se apila en móvil si es necesario */}
      <div className="flex flex-col md:flex-row bg-white dark:bg-dark-card border-b dark:border-gray-700 items-center justify-between px-4 py-2 md:h-16 shrink-0 z-20 shadow-sm gap-2">
          <h2 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
              <Package className="text-primary" size={24}/> {t('orderManager.takeAway')}
          </h2>
          
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full md:w-auto">
              <button 
                  onClick={() => setActiveTab('new')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-white dark:bg-dark-card shadow text-primary' : 'text-gray-500 dark:text-gray-400'}`}
              >
                  <Plus size={16} className="inline mr-1 mb-0.5"/> {t('orderManager.newOrderButton')}
              </button>
              <button 
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white dark:bg-dark-card shadow text-primary' : 'text-gray-500 dark:text-gray-400'}`}
              >
                  <Clock size={16} className="inline mr-1 mb-0.5"/> {t('orderManager.activeOrdersButton')}
              </button>
          </div>
      </div>

      {/* CONTENIDO PRINCIPAL: flex-col en móvil, flex-row en PC */}
      {activeTab === 'new' ? (
          <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
              
              {/* IZQUIERDA: CATÁLOGO */}
              <div className="w-full lg:flex-1 flex flex-col border-r dark:border-gray-700 bg-gray-50 dark:bg-dark-bg">
                  <div className="bg-white dark:bg-dark-card border-b dark:border-gray-700 p-4 space-y-3 sticky top-0 z-10">
                      <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                          <input 
                            type="text" 
                            placeholder={t('orderManager.searchPlaceholder')}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        <button onClick={() => setSelectedCategory('ALL')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'ALL' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>{t('orderManager.all')}</button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>{cat.name}</button>
                        ))}
                      </div>
                  </div>

                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredProducts.map(product => (
                          <div key={product.id} onClick={() => handleProductClick(product)} className="bg-white dark:bg-dark-card p-3 rounded-2xl shadow-sm border dark:border-gray-700 hover:ring-2 ring-primary/50 cursor-pointer active:scale-95 transition-all flex flex-col h-36 justify-between group relative overflow-hidden">
                              {product.track_stock && (
                                  <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                      {product.stock} u.
                                  </div>
                              )}
                              <p className="font-bold text-gray-800 dark:text-white text-sm line-clamp-2 leading-tight">{product.name}</p>
                              <div className="flex justify-between items-end">
                                   <span className="font-black text-lg text-primary">{parseFloat(product.price).toFixed(2)}</span>
                                   <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-white flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><Plus size={18} /></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* DERECHA: CARRITO (En móvil se pone debajo) */}
              <div className="w-full lg:w-96 bg-white dark:bg-dark-card shadow-2xl flex flex-col shrink-0 border-t lg:border-t-0 lg:border-l dark:border-gray-700 min-h-[400px] lg:h-full">
                  <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                      <div className="relative">
                          <User className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                          <input 
                            type="text" 
                            placeholder={t('orderManager.clientNamePlaceholder')} 
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                          />
                      </div>
                      <div className="relative">
                          <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4"/>
                          <input 
                            type="text" 
                            placeholder={t('orderManager.clientPhonePlaceholder')}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary outline-none text-sm"
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] lg:max-h-full">
                      {cart.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-48 lg:h-full text-gray-400 opacity-50 gap-2">
                              <ShoppingBag size={48} strokeWidth={1}/>
                              <p className="text-sm">Carrito vacío</p>
                          </div>
                      ) : (
                          cart.map((item, idx) => (
                              <div key={idx} className="flex gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                  <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg font-bold text-xs shrink-0">
                                      {item.quantity}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between gap-2">
                                          <p className="font-bold text-xs dark:text-white truncate">{item.name}</p>
                                          <p className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0">{(item.price * item.quantity).toFixed(2)}</p>
                                      </div>
                                      {item.notes && <p className="text-[10px] text-gray-500 italic truncate mt-0.5">{item.notes}</p>}
                                  </div>
                                  <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                              </div>
                          ))
                      )}
                  </div>

                  <div className="p-4 bg-white dark:bg-dark-card border-t dark:border-gray-700 sticky bottom-0 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                      <div className="flex justify-between items-center mb-3 px-1">
                          <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{t('orderManager.total')}</span>
                          <span className="text-2xl font-black text-gray-800 dark:text-white">{t('common.currency')}{totalAmount.toFixed(2)}</span>
                      </div>
                      <button 
                          onClick={handleCreateOrder}
                          disabled={isSubmitting || cart.length === 0}
                          className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 text-lg transition-all active:scale-95 ${isSubmitting ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'}`}
                      >
                          {isSubmitting ? <Loader2 className="animate-spin"/> : <><DollarSign size={20} strokeWidth={3}/> {t('orderManager.confirmOrder')}</>}
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          /* PEDIDOS ACTIVOS: Grid adaptable */
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg">
              {loadingOrders ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>
              ) : activeOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <Package size={64} className="mb-4 opacity-20"/>
                      <p className="text-lg font-medium">No hay pedidos activos.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {activeOrders.map(order => (
                          <div key={order.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                              <div className="p-3 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-start">
                                  <div>
                                      <h3 className="font-black text-sm text-gray-800 dark:text-white truncate max-w-[120px]">{order.client_name}</h3>
                                      <p className="text-[10px] text-gray-500 font-mono">#{order.order_number}</p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-lg uppercase">En Cocina</span>
                              </div>
                              <div className="p-3 flex-1 space-y-1">
                                  {order.details.map((item, i) => (
                                      <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                                          <span><b className="mr-1">{item.quantity}x</b> {item.product.name}</span>
                                      </div>
                                  ))}
                              </div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex items-center justify-between">
                                  <span className="font-black text-lg text-gray-800 dark:text-white">{parseFloat(order.total).toFixed(2)} Bs</span>
                                  <button onClick={() => handleSendToCashier(order.id)} className="px-3 py-1.5 bg-green-500 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 active:scale-95"><CheckCircle size={14}/> COBRAR</button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* MODAL AGREGAR (Mismo código original) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct?.name || 'Producto'}>
        <form onSubmit={addToCart} className="space-y-6">
            <div className="text-center">
                <p className="text-4xl font-black text-primary">{t('common.currency')}{selectedProduct ? parseFloat(selectedProduct.price).toFixed(2) : '0.00'}</p>
                {selectedProduct?.track_stock && <p className="text-xs font-bold text-gray-400 mt-1">Stock: {selectedProduct.stock}</p>}
            </div>
            <div className="flex items-center justify-center gap-6">
                <button type="button" onClick={() => qty > 1 && setQty(qty - 1)} className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-90"><Minus size={28} strokeWidth={3}/></button>
                <span className="text-4xl font-black dark:text-white">{qty}</span>
                <button type="button" onClick={() => {
                    if (selectedProduct?.track_stock) {
                        const inCart = cart.find(x => x.id === selectedProduct.id)?.quantity || 0;
                        if ((qty + inCart) >= selectedProduct.stock) return toast.error('Tope de stock');
                    }
                    setQty(qty + 1);
                }} className="w-16 h-16 rounded-2xl bg-primary text-white shadow-lg flex items-center justify-center active:scale-90"><Plus size={28} strokeWidth={3}/></button>
            </div>
            <textarea rows="2" className="w-full p-4 border rounded-2xl bg-gray-50 dark:bg-gray-800 dark:text-white outline-none text-sm" placeholder="Notas (Ej: Sin cebolla...)" value={notes} onChange={e => setNotes(e.target.value)} />
            <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl text-lg active:scale-95 transition-all">{t('orderManager.confirm')}</button>
        </form>
      </Modal>
    </div>
  );
};

export default PickupPoint;