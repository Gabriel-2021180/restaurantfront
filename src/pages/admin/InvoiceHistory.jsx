import { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService';
import { Eye, Printer, Search, FileText, X } from 'lucide-react';
import InvoiceTicket from '../../components/finance/InvoiceTicket';

const InvoiceHistory = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el Modal de Reimpresión
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await financeService.getAllInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando historial", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReprint = async (id) => {
    try {
      // Cargamos la factura completa con detalles
      const fullInvoice = await financeService.getInvoiceById(id);
      setSelectedInvoice(fullInvoice);
    } catch (error) {
      alert("No se pudo cargar la factura");
    }
  };

  // Filtrado simple
  const filtered = invoices.filter(inv => 
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice_number?.toString().includes(searchTerm) ||
    inv.client_nit?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
          <FileText className="text-primary"/> Historial de Facturas
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, NIT o Nro..." 
            className="pl-9 pr-4 py-2 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 uppercase font-bold text-gray-500">
            <tr>
              <th className="px-6 py-3">Nº Factura</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-6 py-4 font-bold">#{inv.invoice_number}</td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(inv.transaction_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold dark:text-white">{inv.client_name}</p>
                  <p className="text-xs text-gray-400">NIT: {inv.client_nit}</p>
                </td>
                <td className="px-6 py-4 font-mono font-bold dark:text-white">
                    {parseFloat(inv.total_amount).toFixed(2)} Bs
                </td>
                <td className="px-6 py-4">
                    {inv.is_annulled ? (
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">ANULADA</span>
                    ) : (
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">VALIDA</span>
                    )}
                </td>
                <td className="px-6 py-4 text-center">
                    <button 
                        onClick={() => handleReprint(inv.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip"
                        title="Ver / Reimprimir"
                    >
                        <Eye size={18} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-400">No se encontraron facturas.</div>
        )}
      </div>

      {/* MODAL DE REIMPRESIÓN */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto relative flex flex-col">
                <button 
                    onClick={() => setSelectedInvoice(null)}
                    className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300 z-10 print:hidden"
                >
                    <X size={20}/>
                </button>
                
                <div className="p-4">
                    <InvoiceTicket invoice={selectedInvoice} />
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-center gap-4 print:hidden">
                    <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
                    >
                        <Printer size={18}/> Imprimir
                    </button>
                    <button 
                        onClick={() => setSelectedInvoice(null)} 
                        className="px-6 py-2 bg-gray-300 font-bold rounded-xl hover:bg-gray-400"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;