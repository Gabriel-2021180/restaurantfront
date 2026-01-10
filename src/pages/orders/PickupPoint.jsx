import { useState, useEffect } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useFinance } from '../../hooks/useFinance';
import orderService from '../../services/orderService';
import { financeService } from '../../services/financeService';

import CheckoutModal from '../../components/finance/CheckoutModal';
import InvoiceTicket from '../../components/finance/InvoiceTicket';
import { 
  ShoppingBag, Plus, Trash2, User, Phone, Loader2, CheckCircle, 
  Image as ImageIcon, ArrowLeft, Clock, Utensils, DollarSign, RefreshCw, Printer 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

const PickupPoint = () => {
  const { products } = useProducts();
  const { categories } = useCategories();
  const { generateInvoice } = useFinance();

  // Estados
  const [activeTab, setActiveTab] = useState('new'); 
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [client, setClient] = useState({ name: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeOrders, setActiveOrders] = useState([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // Estados Cobro
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedOrderToPay, setSelectedOrderToPay] = useState(null);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);

  // --- CARGAR DATOS ---
  const loadActiveOrders = async () => {
    setLoadingActive(true);
    try {
        const data = await orderService.getActivePickups(); // <--- USA LA RUTA NUEVA
        setActiveOrders(data);
    } catch (error) {
        console.error("Error cargando pickups:", error);
    } finally {
        setLoadingActive(false);
    }
  };

  // Recargar al cambiar de pestaña
  useEffect(() => {
    if (activeTab === 'active') {
        loadActiveOrders();
        const interval = setInterval(loadActiveOrders, 10000); 
        return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Filtros
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'ALL' || 
                     String(p.category_id) === String(selectedCategory) ||
                     (p.category && String(p.category.id) === String(selectedCategory));
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  // Funciones Carrito
  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
        setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
        setCart([...cart, { product_id: product.id, name: product.name, price: parseFloat(product.price), quantity: 1, notes: '', image_url: product.image_url }]);
    }
  };

  const updateQty = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateNotes = (index, text) => {
    const newCart = [...cart];
    newCart[index].notes = text;
    setCart(newCart);
  };

  const totalCart = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // Enviar Pedido
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return Swal.fire('Carrito vacío', 'Agrega productos.', 'warning');
    if (!client.name.trim()) return Swal.fire('Faltan datos', 'El nombre del cliente es obligatorio.', 'warning');

    setIsSubmitting(true);
    try {
        const newOrder = await orderService.createPickupOrder({
            client_name: client.name,
            client_phone: client.phone,
            items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, notes: i.notes }))
        });

        if (newOrder && newOrder.id) await orderService.sendToKitchen(newOrder.id);

        Swal.fire({
            toast: true, position: 'top-end', title: '¡Pedido en Cocina!',
            text: `Orden enviada.`, icon: 'success', timer: 2000, showConfirmButton: false
        });

        setCart([]);
        setClient({ name: '', phone: '' });
        setActiveTab('active'); // <--- TE LLEVA A VER TU PEDIDO

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo crear el pedido.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Cobro
  const handleInitiateCheckout = (order) => {
      setSelectedOrderToPay(order);
      setIsCheckoutOpen(true);
  };

  const handleConfirmCheckout = async (formData) => {
      try {
          Swal.fire({ title: 'Facturando...', didOpen: () => Swal.showLoading() });
          
          let invoice = await generateInvoice({ 
              order_id: selectedOrderToPay.id, 
              client_nit: formData.nit, 
              client_name: formData.name, 
              payment_method: formData.payment_method 
          });
          
          const details = invoice.details || invoice.order?.details || [];
          if (details.length === 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              invoice = await financeService.getInvoiceById(invoice.id);
          }

          Swal.close(); 
          setIsCheckoutOpen(false);
          setGeneratedInvoice(invoice); 
          loadActiveOrders(); 
      } catch (error) { 
          Swal.close();
          console.error(error);
          Swal.fire('Error', 'No se pudo facturar.', 'error');
      }
  };

  const handleFinishInvoice = () => {
      setGeneratedInvoice(null);
      setSelectedOrderToPay(null);
  };

  if (generatedInvoice) { 
    return (
        <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full flex flex-col h-[90vh]">
                <div className="text-center mb-4 shrink-0">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="text-green-600 w-10 h-10"/>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800">¡Cobro Exitoso!</h2>
                    <p className="text-gray-500">Factura #{generatedInvoice.invoice_number}</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-y-auto p-4 mb-4 flex justify-center shadow-inner">
                    <InvoiceTicket invoice={generatedInvoice} />
                </div>
                <div className="grid grid-cols-2 gap-4 shrink-0 print:hidden">
                    <button onClick={() => setTimeout(() => window.print(), 100)} className="py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg">
                        <Printer size={24}/> IMPRIMIR
                    </button>
                    <button onClick={handleFinishInvoice} className="py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl">
                        Volver a Pedidos
                    </button>
                </div>
            </div>
        </div>
    ); 
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-dark-bg overflow-hidden flex-col">
      
      {/* HEADER */}
      <div className="h-16 bg-white dark:bg-dark-card border-b dark:border-gray-700 flex items-center px-4 justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
              <Link to="/cashier" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"><ArrowLeft size={20}/></Link>
              <h1 className="text-xl font-bold dark:text-white hidden md:block">Punto de Pedido</h1>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl ml-4">
                  <button onClick={() => setActiveTab('new')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition ${activeTab === 'new' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
                      <Plus size={16}/> Nuevo Pedido
                  </button>
                  <button onClick={() => setActiveTab('active')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition ${activeTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
                      <Clock size={16}/> Pedidos Activos
                      {activeOrders.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{activeOrders.length}</span>}
                  </button>
              </div>
          </div>
          {activeTab === 'new' && (
             <div className="w-1/3 hidden md:block">
                <input type="text" placeholder="Buscar producto..." className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none dark:text-white border-transparent focus:bg-white focus:border-primary border-2 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
             </div>
          )}
      </div>

      {activeTab === 'new' && (
        <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col">
                <div className="p-4 flex gap-2 overflow-x-auto bg-white dark:bg-dark-card border-b dark:border-gray-700 shrink-0">
                    <button onClick={() => setSelectedCategory('ALL')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${selectedCategory === 'ALL' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>Todo</button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm font-bold transition ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{cat.name}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredProducts.map(product => (
                            <div key={product.id} onClick={() => addToCart(product)} className="bg-white dark:bg-dark-card p-3 rounded-2xl shadow-sm hover:shadow-md cursor-pointer border border-transparent hover:border-primary transition-all active:scale-95 group h-48 flex flex-col justify-between">
                                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center mb-2">
                                    {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : <ImageIcon className="text-gray-300"/>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm dark:text-white line-clamp-1">{product.name}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="font-black text-primary">${product.price}</span>
                                        <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><Plus size={14}/></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="w-96 bg-white dark:bg-dark-card border-l dark:border-gray-700 flex flex-col shadow-2xl z-20">
                <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h2 className="font-bold text-gray-500 text-xs uppercase mb-3">Datos del Cliente</h2>
                    <div className="space-y-3">
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/>
                            <input type="text" placeholder="Nombre (Obligatorio)" className="w-full pl-9 p-2 border rounded-lg dark:bg-gray-700 dark:text-white text-sm" value={client.name} onChange={e => setClient({...client, name: e.target.value})}/>
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/>
                            <input type="text" placeholder="Teléfono" className="w-full pl-9 p-2 border rounded-lg dark:bg-gray-700 dark:text-white text-sm" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})}/>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <ShoppingBag size={48} className="mb-2"/>
                            <p>Carrito Vacío</p>
                        </div>
                    ) : (
                        cart.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-2 border-b border-dashed pb-3 last:border-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 items-center">
                                        <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
                                            <button onClick={() => updateQty(idx, -1)} className="px-2 py-1 bg-gray-100 hover:bg-red-100">-</button>
                                            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                            <button onClick={() => updateQty(idx, 1)} className="px-2 py-1 bg-gray-100 hover:bg-green-100">+</button>
                                        </div>
                                        <span className="text-sm font-bold dark:text-white w-32 truncate">{item.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                                <input type="text" placeholder="Nota: Sin cebolla..." className="w-full p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs border-none outline-none dark:text-white" value={item.notes} onChange={e => updateNotes(idx, e.target.value)}/>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-5 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-gray-500 font-bold">Total a Pagar</span>
                        <span className="text-3xl font-black text-gray-800 dark:text-white">${totalCart.toFixed(2)}</span>
                    </div>
                    <button onClick={handleSubmitOrder} disabled={isSubmitting || cart.length === 0} className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition">
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <><CheckCircle size={20}/> Confirmar y Enviar</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* BODY PEDIDOS ACTIVOS */}
      {activeTab === 'active' && (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-dark-bg">
              <div className="flex justify-end mb-4">
                  <button onClick={loadActiveOrders} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition">
                      <RefreshCw size={14} className={loadingActive ? "animate-spin" : ""}/> Actualizar lista
                  </button>
              </div>

              {activeOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <Utensils size={48} className="mb-4 opacity-30"/>
                      <p>No hay pedidos en curso.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {activeOrders.map(order => (
                          <div key={order.id} className="bg-white dark:bg-dark-card rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col hover:shadow-xl transition-all">
                              <div className="p-4 bg-blue-50 border-b border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 font-black text-sm shadow-sm border border-blue-100">#{order.order_number}</div>
                                      <div>
                                          <h3 className="font-bold text-gray-800 dark:text-white line-clamp-1">{order.client_name || order.pickup_name || "Cliente"}</h3>
                                          <p className="text-[10px] text-gray-500 font-bold uppercase">{new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="p-4 flex-1">
                                  <div className="space-y-2 mb-4">
                                      <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                          <span className="text-xs font-bold text-gray-500 uppercase">Estado</span>
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                                              order.status === 'ready' ? 'bg-green-100 text-green-700' : 
                                              'bg-orange-100 text-orange-700'
                                          }`}>
                                              {order.status === 'ready' ? '✅ LISTO' : '👨‍🍳 EN COCINA'}
                                          </span>
                                      </div>
                                      <div className="flex justify-between items-end">
                                          <span className="text-xs text-gray-400">Total a cobrar</span>
                                          <span className="text-2xl font-black text-gray-800 dark:text-white">${parseFloat(order.total).toFixed(2)}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="p-4 border-t dark:border-gray-700">
                                  <button 
                                    onClick={() => handleInitiateCheckout(order)} 
                                    disabled={order.status !== 'ready' && order.status !== 'pending' && order.status !== 'cooking' && order.status !== 'pending_payment'} 
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md flex justify-center items-center gap-2 active:scale-95 transition disabled:bg-gray-300"
                                  >
                                      <DollarSign size={18}/> COBRAR
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onInvoiceGenerated={handleConfirmCheckout} />
    </div>
  );
};

export default PickupPoint;