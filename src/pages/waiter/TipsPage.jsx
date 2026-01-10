import { useState, useEffect } from 'react';
import userService from '../../services/userService'; 
import Modal from '../../components/ui/Modal';
import { DollarSign, Clock, CheckCircle2, Loader2, Award, RefreshCw, Smile } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
const TipsPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('day'); 
  
  // ESTADOS DE DATOS (Separados como dijiste)
  const [stats, setStats] = useState(null);       // Tarjetas naranjas
  const [history, setHistory] = useState([]);     // Lista Historial (Derecha)
  const [pendingOrders, setPendingOrders] = useState([]); // Lista Pendientes (Izquierda)
  
  const [loading, setLoading] = useState(true);

  // ESTADOS DEL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipNote, setTipNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- CARGA INICIAL Y POR PERIODO ---
  useEffect(() => {
    loadAllData();
  }, [period]);

  const loadAllData = async () => {
    setLoading(true);
    // Ejecutamos ambas peticiones en paralelo para que sea más rápido
    await Promise.all([
        loadStats(), 
        loadPending()
    ]);
    setLoading(false);
  };

  // 1. CARGAR HISTORIAL Y TARJETAS (Fuente: tips table)
  const loadStats = async () => {
    try {
        const tipsData = await userService.getTipsStats(period);
        // Asumiendo que tu back devuelve: { stats: {...}, history: [...] }
        setStats(tipsData.stats || null);
        setHistory(tipsData.history || []);
    } catch (e) { 
        console.error("Error cargando stats:", e); 
    }
  };

  // 2. CARGAR PENDIENTES (Fuente: orders table con filtro pending_tip=true)
    const loadPending = async () => {
    try {
        const orders = await userService.getCompletedOrders();
        
        const myOrders = Array.isArray(orders) 
            ? orders.filter(o => o.waiter && o.waiter.id === user.id) 
            : [];

        setPendingOrders(myOrders);
    } catch (e) { 
        console.error("Error cargando pendientes:", e); 
    }
  };

  // --- MANEJO DEL FORMULARIO ---
  const handleOpenRegister = (order) => {
    setSelectedOrder(order);
    setTipAmount('');
    setTipNote('');
    setIsModalOpen(true);
  };

  const handleSubmitTip = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // A. ENVIAR AL BACKEND
      await userService.registerTip({
        order_id: selectedOrder.id,
        amount: parseFloat(tipAmount) || 0,
        note: tipNote
      });

      // B. FEEDBACK VISUAL
      Swal.fire({ 
          toast: true, position: 'top-end', title: 'Guardado', 
          icon: 'success', timer: 1500, showConfirmButton: false 
      });
      setIsModalOpen(false);

      // C. REFRESCAR DATOS REALES (La clave de tu nueva lógica)
      // 1. Recargar pendientes: La orden que acabamos de hacer DESAPARECERÁ sola porque el back ya no la manda.
      loadPending(); 
      // 2. Recargar stats: El dinero se sumará y aparecerá en el historial.
      loadStats();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar la propina.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper de fecha
  const formatTime = (dateString) => {
      if (!dateString) return '--:--';
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading && !stats) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Award className="text-yellow-500"/> Mis Propinas
            </h2>
            <p className="text-sm text-gray-500">Gestiona tus ganancias.</p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={loadAllData} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 tooltip" title="Actualizar Datos"><RefreshCw size={18}/></button>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {['day', 'week', 'month'].map(p => (
                    <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition ${period === p ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{p === 'day' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}</button>
                ))}
            </div>
        </div>
      </div>

      {/* STATS (Tarjetas Naranjas) */}
      {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-5 rounded-2xl text-white shadow-lg">
                <p className="text-xs font-bold uppercase opacity-80 mb-1">Ganado {period === 'day' ? 'Hoy' : 'Este periodo'}</p>
                {/* Aseguramos que muestre 0 si viene null */}
                <p className="text-4xl font-black">{stats.total_money || 0} Bs</p>
            </div>
            <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mesas Atendidas</p>
                <p className="text-2xl font-black text-gray-800 dark:text-white">{stats.tables_served || 0}</p>
            </div>
            <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Con Propina</p>
                <p className="text-2xl font-black text-green-600">{stats.tables_with_tip || 0}</p>
            </div>
            <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Sin Propina</p>
                <p className="text-2xl font-black text-gray-400">{stats.tables_without_tip || 0}</p>
            </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* COLUMNA IZQUIERDA: PENDIENTES */}
          {/* Solo mostramos pendientes si estamos viendo el día 'day', o si prefieres verlas siempre quita la condición */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-blue-500"/> Pendientes por Registrar
              </h3>
              
              {pendingOrders.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50"/>
                      <p>¡Todo al día!</p>
                      <p className="text-xs">No hay mesas finalizadas sin registrar.</p>
                  </div>
              ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {pendingOrders.map(order => (
                          <div key={order.id} className="flex justify-between items-center p-4 bg-white hover:bg-blue-50 dark:bg-dark-bg dark:hover:bg-blue-900/10 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors animate-fade-in group">
                              <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-800 dark:text-white text-lg">
                                        {order.table?.table_number || "Mesa ?"}
                                    </span>
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
                                        #{order.order_number}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 font-medium">Venta: <span className="text-gray-800 dark:text-gray-300 font-bold">{order.total} Bs</span></p>
                              </div>
                              <button 
                                onClick={() => handleOpenRegister(order)} 
                                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-blue-700 transition transform active:scale-95"
                              >
                                Registrar
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {/* COLUMNA DERECHA: HISTORIAL */}
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-500"/> Historial Registrado
              </h3>
              
              <div className="space-y-0 divide-y dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {history.length > 0 ? (
                      history.map((item) => (
                        <div key={item.id} className="py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-full ${item.was_zero ? 'bg-gray-100 text-gray-400' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {item.was_zero ? <Smile size={18} className="rotate-180"/> : <DollarSign size={18}/>}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-white">{item.table || "Mesa ?"}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{formatTime(item.date)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-black text-lg ${item.was_zero ? 'text-gray-300' : 'text-gray-800 dark:text-white'}`}>
                                    {item.amount} Bs
                                </p>
                                {item.note && <p className="text-[10px] text-gray-400 italic max-w-[100px] truncate">{item.note}</p>}
                            </div>
                        </div>
                      ))
                  ) : (
                      <p className="text-center text-gray-400 py-10 italic">No hay registros en este periodo.</p>
                  )}
              </div>
          </div>
      </div>

      {/* MODAL DE REGISTRO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Registrar Propina - ${selectedOrder?.table?.table_number}`}>
        <form onSubmit={handleSubmitTip} className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-300 uppercase font-bold mb-1">Total de la Venta</p>
                <p className="text-3xl font-black text-blue-800 dark:text-white">{selectedOrder?.total} Bs</p>
            </div>

            <div>
                <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Monto Propina</label>
                <div className="relative">
                    <DollarSign className="absolute left-4 top-4 text-gray-400"/>
                    <input 
                        type="number" 
                        step="0.50" 
                        min="0" 
                        autoFocus 
                        required 
                        className="w-full pl-10 pr-4 py-4 text-2xl font-black border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 outline-none dark:bg-gray-800 dark:text-white transition-all" 
                        placeholder="0.00" 
                        value={tipAmount} 
                        onChange={e => setTipAmount(e.target.value)} 
                    />
                </div>
            </div>

            <div>
                <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Nota (Opcional)</label>
                <textarea 
                    rows="2" 
                    className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                    placeholder="Ej: Excelente servicio..." 
                    value={tipNote} 
                    onChange={e => setTipNote(e.target.value)} 
                />
            </div>

            <button 
                type="submit" 
                disabled={submitting} 
                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex justify-center items-center gap-2 active:scale-95"
            >
                {submitting ? <Loader2 className="animate-spin"/> : 'Confirmar y Guardar'}
            </button>
        </form>
      </Modal>
    </div>
  );
};

export default TipsPage;