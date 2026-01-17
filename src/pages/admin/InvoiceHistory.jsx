import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import financeService  from '../../services/financeService';
import { Eye, Printer, Search, FileText, X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import InvoiceTicket from '../../components/finance/InvoiceTicket';
import Swal from 'sweetalert2';
import { START_YEAR } from '../../config';

const InvoiceHistory = () => {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, last_page: 1 });
  const [filterType, setFilterType] = useState('dine_in');
  const [dateRange, setDateRange] = useState('day'); 
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const startOfSystem = `${START_YEAR}-01-01`;

  useEffect(() => {
    loadInvoices();
  }, [filterType, dateRange, pagination.page]); 

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let periodParam = 'day'; 
      let fromParam = null;
      let toParam = null;

      if (dateRange === 'custom') {
          if (!customDates.from || !customDates.to) {
             setLoading(false); return; 
          }
          fromParam = customDates.from;
          toParam = customDates.to;
          periodParam = null; 
      } else {
          periodParam = dateRange === 'today' ? 'day' : dateRange;
      }
      
      const response = await financeService.getAllInvoices(
          filterType, periodParam, fromParam, toParam, pagination.page
      );

      if (response && response.data && Array.isArray(response.data)) {
          setInvoices(response.data); 
          setPagination({
              page: response.meta.page,
              total: response.meta.total,
              last_page: response.meta.last_page
          });
      } else if (Array.isArray(response)) {
          setInvoices(response);
      } else {
          setInvoices([]);
      }

    } catch (error) {
      console.error(t('invoiceHistory.errorHistory'), error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFilter = () => {
      if (customDates.from < startOfSystem) return Swal.fire(t('invoiceHistory.invalidDate'), t('invoiceHistory.systemDidntExist'), 'warning');
      if (customDates.to > todayStr) return Swal.fire(t('invoiceHistory.futureBlocked'), t('invoiceHistory.cannotSeeFutureInvoices'), 'warning');
      if (customDates.from > customDates.to) return Swal.fire(t('invoiceHistory.error'), t('invoiceHistory.startDateBeforeEndDate'), 'error');
      
      setDateRange('custom'); 
      loadInvoices(); 
  };

  const handleReprint = async (id) => {
    try {
      const fullInvoice = await financeService.getInvoiceById(id);
      setSelectedInvoice(fullInvoice);
    } catch (error) { alert(t('invoiceHistory.errorLoadingInvoice')); }
  };

  // 🔥 SOLUCIÓN INFALIBLE DE IMPRESIÓN 🔥
  // Abre una ventana limpia, copia el ticket y lo imprime.
  const handlePrint = () => {
    const printContent = document.getElementById('invoice-ticket-container');
    if (!printContent) return;

    // 1. DEFINIR NOMBRE DEL ARCHIVO
    // Al cambiar el título de la ventana nueva, el navegador usará esto como nombre del PDF
    const invoiceNumber = selectedInvoice?.invoice_number || 'S/N';
    const fileName = `Factura_No_${invoiceNumber}`;

    // 2. ABRIR VENTANA LIMPIA
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write(`<html><head><title>${fileName}</title>`); // <--- AQUÍ ESTÁ LA MAGIA DEL NOMBRE
    
    // Copiamos los estilos base (Tailwind)
    printWindow.document.write(document.head.innerHTML); 
    
    // 3. INYECTAR CSS CORRECTIVO (Para centrar)
    // Esto sobreescribe cualquier 'position: fixed' que venga de index.css
    printWindow.document.write(`
        <style>
            @media print {
                body {
                    display: flex !important;
                    justify-content: center !important; /* Centrado Horizontal */
                    align-items: flex-start !important; /* Pegado arriba, no al medio vertical */
                    margin: 0 !important;
                    padding: 10px !important; /* Un pequeño margen de seguridad */
                    background-color: white !important;
                }
                
                #invoice-ticket-container {
                    position: static !important; /* IMPORTANTE: Ya no fixed */
                    width: 100% !important;
                    max-width: 80mm !important; /* Ancho térmico estándar */
                    margin: 0 auto !important; /* Centrado automático */
                    box-shadow: none !important;
                    left: auto !important;
                    top: auto !important;
                }

                /* Ocultar elementos basura que suelen colarse */
                button, .no-print { display: none !important; }
            }
            
            /* Estilos para ver la previa en la ventanita antes de que salga el diálogo */
            body {
                display: flex;
                justify-content: center;
                background: #f3f4f6;
                padding: 20px;
            }
        </style>
    `);

    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.outerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();

    // 4. IMPRIMIR Y CERRAR
    setTimeout(() => {
        printWindow.print();
        // Nota: Algunos navegadores cierran la ventana antes de que termines si no esperas
        // Por eso dejamos la ventana abierta o esperamos al evento (pero setTimeout es más universal)
        printWindow.close(); 
    }, 500);
  };

  const filtered = invoices.filter(inv => 
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice_number?.toString().includes(searchTerm) ||
    inv.client_nit?.includes(searchTerm) ||
    inv.order_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6">
      {/* HEADER Y FILTROS (Igual que antes) */}
      <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <FileText className="text-primary"/> {t('invoiceHistory.invoiceHistory')}
            </h2>
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input type="text" placeholder={t('invoiceHistory.searchPlaceholder')} className="w-full md:w-64 pl-9 pr-4 py-2 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end border-t pt-4 dark:border-gray-700">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setFilterType('dine_in')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'dine_in' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('invoiceHistory.tables')}</button>
                <button onClick={() => setFilterType('pickup')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'pickup' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('invoiceHistory.orders')}</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase mr-2"><Calendar size={14} className="inline mb-0.5"/> {t('invoiceHistory.view')}:</span>
                <button onClick={() => setDateRange('today')} className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition ${dateRange === 'today' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{t('invoiceHistory.today')}</button>
                <button onClick={() => setDateRange('week')} className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition ${dateRange === 'week' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{t('invoiceHistory.thisWeek')}</button>
                <button onClick={() => setDateRange('month')} className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition ${dateRange === 'month' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{t('invoiceHistory.thisMonth')}</button>
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border ml-2">
                    <input type="date" className="bg-transparent text-xs outline-none" value={customDates.from} onChange={e => setCustomDates({...customDates, from: e.target.value})} max={todayStr} min={startOfSystem} />
                    <span className="text-gray-400">-</span>
                    <input type="date" className="bg-transparent text-xs outline-none" value={customDates.to} onChange={e => setCustomDates({...customDates, to: e.target.value})} max={todayStr} min={startOfSystem} />
                    <button onClick={handleCustomFilter} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold">{t('invoiceHistory.filter')}</button>
                </div>
            </div>
        </div>
      </div>

      {/* TABLA DE FACTURAS */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 uppercase font-bold text-gray-500">
            <tr>
              <th className="px-6 py-3">{t('invoiceHistory.number')}</th>
              <th className="px-6 py-3">{t('invoiceHistory.date')}</th>
              <th className="px-6 py-3">{t('invoiceHistory.origin')}</th>
              <th className="px-6 py-3">{t('invoiceHistory.client')}</th>
              <th className="px-6 py-3">{t('invoiceHistory.total')}</th>
              <th className="px-6 py-3">{t('invoiceHistory.status')}</th>
              <th className="px-6 py-3 text-center">{t('invoiceHistory.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500"><Loader2 className="animate-spin text-primary w-8 h-8 mx-auto"/></td></tr>
            ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400 flex flex-col items-center"><AlertCircle size={32} className="mb-2 opacity-50"/>{t('invoiceHistory.noInvoicesInPeriod')}</td></tr>
            ) : (
                filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-bold">#{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(inv.transaction_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${filterType === 'dine_in' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{inv.order_identifier}</span></td>
                    <td className="px-6 py-4"><p className="font-bold dark:text-white uppercase">{inv.client_name || t('invoiceHistory.sn')}</p><p className="text-xs text-gray-400">{t('invoiceHistory.nit')}: {inv.client_nit || "0"}</p></td>
                    <td className="px-6 py-4 font-mono font-bold dark:text-white">{parseFloat(inv.total_amount).toFixed(2)} Bs</td>
                    <td className="px-6 py-4">
                        {inv.is_annulled ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">{t('invoiceHistory.annulled')}</span> : <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">{t('invoiceHistory.valid')}</span>}
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

      {/* MODAL REIMPRESIÓN MEJORADO */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto relative flex flex-col w-full max-w-md">
                <button onClick={() => setSelectedInvoice(null)} className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300 z-10 print:hidden"><X size={20}/></button>
                <div className="p-4 flex justify-center bg-gray-50">
                    {/* El Ticket se renderiza aquí para que 'document.getElementById' lo encuentre */}
                    <InvoiceTicket invoice={selectedInvoice} />
                </div>
                <div className="p-4 bg-white border-t flex justify-center gap-4 print:hidden">
                    {/* Botón llama a nuestra función mágica handlePrint */}
                    <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg">
                        <Printer size={20}/> {t('invoiceHistory.print')}
                    </button>
                    <button onClick={() => setSelectedInvoice(null)} className="px-6 py-3 bg-gray-200 font-bold rounded-xl hover:bg-gray-300">{t('invoiceHistory.close')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;