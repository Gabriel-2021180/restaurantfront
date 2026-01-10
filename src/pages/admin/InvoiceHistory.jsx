import { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService';
import { Eye, Printer, Search, FileText, X, Calendar, AlertCircle } from 'lucide-react'; // Agregué AlertCircle
import InvoiceTicket from '../../components/finance/InvoiceTicket';
import Swal from 'sweetalert2'; // Para alertas bonitas si se pasan de fecha

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterType, setFilterType] = useState('dine_in');
  const [dateRange, setDateRange] = useState('today'); 
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // FECHA LÍMITE (HOY)
  const todayStr = new Date().toISOString().split('T')[0];
  const startOfSystem = "2025-01-01"; // Fecha de inauguración

  useEffect(() => {
    loadInvoices();
  }, [filterType, dateRange]); // Se recarga si cambian estos

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let from = null;
      let to = null;

      const now = new Date();

      if (dateRange === 'week') {
          // Lógica Semana: Lunes a Domingo (o Hoy)
          const day = now.getDay(); // 0 es Domingo
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
          const monday = new Date(now.setDate(diff));
          
          from = monday.toISOString().split('T')[0];
          to = todayStr; // Hasta hoy
      } 
      else if (dateRange === 'custom') {
          // VALIDACIÓN DE FECHAS EN EL CLICK "FILTRAR"
          if (!customDates.from || !customDates.to) {
              // Si faltan fechas y estamos en modo custom, no cargamos nada o cargamos hoy por defecto
              setLoading(false); return; 
          }
          from = customDates.from;
          to = customDates.to;
      }
      
      // Si es 'today', from y to se van como null y el backend pone "HOY"

      const data = await financeService.getAllInvoices(filterType, from, to);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error historial", error);
    } finally {
      setLoading(false);
    }
  };

  // Handler para el botón "Filtrar" manual
  const handleCustomFilter = () => {
      if (customDates.from < startOfSystem) {
          return Swal.fire('Fecha inválida', 'El sistema no existía antes de 2025.', 'warning');
      }
      if (customDates.to > todayStr) {
          return Swal.fire('Futuro bloqueado', 'No puedes ver facturas del futuro.', 'warning');
      }
      if (customDates.from > customDates.to) {
          return Swal.fire('Error', 'La fecha de inicio debe ser antes que la final.', 'error');
      }
      
      setDateRange('custom'); // Esto dispara el useEffect
      loadInvoices(); // Forzamos carga por si ya estaba en custom
  };

  const handleReprint = async (id) => {
    try {
      const fullInvoice = await financeService.getInvoiceById(id);
      setSelectedInvoice(fullInvoice);
    } catch (error) { alert("Error cargando factura"); }
  };

  const filtered = invoices.filter(inv => 
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice_number?.toString().includes(searchTerm) ||
    inv.client_nit?.includes(searchTerm) ||
    inv.order_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <FileText className="text-primary"/> Historial de Facturas
            </h2>
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Buscar cliente, NIT..." 
                    className="w-full md:w-64 pl-9 pr-4 py-2 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end border-t pt-4 dark:border-gray-700">
            {/* TIPO */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setFilterType('dine_in')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'dine_in' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Mesas</button>
                <button onClick={() => setFilterType('pickup')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'pickup' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Pedidos</button>
            </div>

            {/* FECHAS */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase mr-2"><Calendar size={14} className="inline mb-0.5"/> Ver:</span>
                
                <button onClick={() => setDateRange('today')} className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition ${dateRange === 'today' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Hoy</button>
                <button onClick={() => setDateRange('week')} className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition ${dateRange === 'week' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Esta Semana</button>
                
                {/* Rango Manual VALIDADO */}
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border ml-2">
                    <input 
                        type="date" 
                        className="bg-transparent text-xs outline-none"
                        value={customDates.from} 
                        onChange={e => setCustomDates({...customDates, from: e.target.value})}
                        max={todayStr}
                        min={startOfSystem}
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                        type="date" 
                        className="bg-transparent text-xs outline-none"
                        value={customDates.to} 
                        onChange={e => setCustomDates({...customDates, to: e.target.value})}
                        max={todayStr}
                        min={startOfSystem}
                    />
                    <button onClick={handleCustomFilter} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold">Filtrar</button>
                </div>
            </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 uppercase font-bold text-gray-500">
            <tr>
              <th className="px-6 py-3">Nº</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Origen</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400 flex flex-col items-center">
                    <AlertCircle size={32} className="mb-2 opacity-50"/>
                    No hay facturas en este periodo.
                </td></tr>
            ) : (
                filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-bold">#{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(inv.transaction_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${filterType === 'dine_in' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                            {inv.order_identifier}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <p className="font-bold dark:text-white uppercase">{inv.client_name || "S/N"}</p>
                        <p className="text-xs text-gray-400">NIT: {inv.client_nit || "0"}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold dark:text-white">{parseFloat(inv.total_amount).toFixed(2)} Bs</td>
                    <td className="px-6 py-4">
                        {inv.is_annulled ? (
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">ANULADA</span>
                        ) : (
                            <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">VALIDA</span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button onClick={() => handleReprint(inv.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Eye size={18} /></button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL REIMPRESIÓN */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto relative flex flex-col w-full max-w-md">
                <button onClick={() => setSelectedInvoice(null)} className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300 z-10 print:hidden"><X size={20}/></button>
                <div className="p-4 flex justify-center bg-gray-50">
                    <InvoiceTicket invoice={selectedInvoice} />
                </div>
                <div className="p-4 bg-white border-t flex justify-center gap-4 print:hidden">
                    <button onClick={() => setTimeout(() => window.print(), 500)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg">
                        <Printer size={20}/> Imprimir
                    </button>
                    <button onClick={() => setSelectedInvoice(null)} className="px-6 py-3 bg-gray-200 font-bold rounded-xl hover:bg-gray-300">Cerrar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;