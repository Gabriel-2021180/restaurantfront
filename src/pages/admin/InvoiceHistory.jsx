import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import financeService  from '../../services/financeService';
import { Eye, Printer, Search, FileText, X, Calendar, Loader2, AlertCircle, User, DollarSign, Clock } from 'lucide-react';
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

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-ticket-container');
    if (!printContent) return;

    const invoiceNumber = selectedInvoice?.invoice_number || 'S/N';
    const fileName = `Factura_No_${invoiceNumber}`;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`<html><head><title>${fileName}</title>`);
    printWindow.document.write(document.head.innerHTML); 
    
    printWindow.document.write(`
        <style>
            @media print {
                body {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: flex-start !important;
                    margin: 0 !important;
                    padding: 10px !important;
                    background-color: white !important;
                }
                #invoice-ticket-container {
                    position: static !important;
                    width: 100% !important;
                    max-width: 80mm !important;
                    margin: 0 auto !important;
                    box-shadow: none !important;
                    left: auto !important;
                    top: auto !important;
                }
                button, .no-print { display: none !important; }
            }
            body { display: flex; justify-content: center; background: #f3f4f6; padding: 20px; }
        </style>
    `);

    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.outerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close(); 
    }, 500);
  };

  const filtered = invoices.filter(inv => 
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice_number?.toString().includes(searchTerm) ||
    inv.client_nit?.includes(searchTerm) ||
    inv.order_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- COMPONENTES AUXILIARES DE ESTADO (Para no repetir código en móvil y desktop) ---
  const StatusBadge = ({ isAnnulled }) => (
    isAnnulled 
      ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">{t('invoiceHistory.annulled')}</span>
      : <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">{t('invoiceHistory.valid')}</span>
  );

  const OriginBadge = ({ identifier, type }) => (
    <span className={`px-2 py-1 rounded text-xs font-bold ${type === 'dine_in' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
        {identifier}
    </span>
  );

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0"> {/* Padding bottom extra para móvil */}
      
      {/* HEADER Y FILTROS */}
      <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        
        {/* Título y Buscador */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white w-full md:w-auto">
                <FileText className="text-primary"/> {t('invoiceHistory.invoiceHistory')}
            </h2>
            <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder={t('invoiceHistory.searchPlaceholder')} 
                    className="w-full md:w-64 pl-9 pr-4 py-2 border rounded-xl dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
        </div>

        {/* Filtros Avanzados (Responsive) */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-end border-t pt-4 dark:border-gray-700">
            
            {/* Tipo de Venta (Pestañas) */}
            <div className="w-full xl:w-auto flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button onClick={() => setFilterType('dine_in')} className={`flex-1 xl:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition text-center ${filterType === 'dine_in' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('invoiceHistory.tables')}</button>
                <button onClick={() => setFilterType('pickup')} className={`flex-1 xl:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition text-center ${filterType === 'pickup' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('invoiceHistory.orders')}</button>
            </div>

            {/* Selector de Fechas */}
            <div className="w-full xl:w-auto flex flex-col md:flex-row flex-wrap items-center gap-2">
                <span className="hidden md:inline text-xs font-bold text-gray-400 uppercase mr-2">
                    <Calendar size={14} className="inline mb-0.5"/> {t('invoiceHistory.view')}:
                </span>
                
                {/* Botones rápidos */}
                <div className="flex w-full md:w-auto gap-2">
                    {['today', 'week', 'month'].map((range) => (
                        <button 
                            key={range}
                            onClick={() => setDateRange(range)} 
                            className={`flex-1 md:flex-none px-3 py-1.5 border rounded-lg text-xs font-bold transition ${dateRange === range ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            {t(`invoiceHistory.${range === 'today' ? 'today' : range === 'week' ? 'thisWeek' : 'thisMonth'}`)}
                        </button>
                    ))}
                </div>

                {/* Fechas Personalizadas */}
                <div className="w-full md:w-auto flex items-center gap-2 bg-gray-50 p-1 rounded-lg border mt-2 md:mt-0">
                    <input type="date" className="bg-transparent text-xs outline-none w-full md:w-auto" value={customDates.from} onChange={e => setCustomDates({...customDates, from: e.target.value})} max={todayStr} min={startOfSystem} />
                    <span className="text-gray-400">-</span>
                    <input type="date" className="bg-transparent text-xs outline-none w-full md:w-auto" value={customDates.to} onChange={e => setCustomDates({...customDates, to: e.target.value})} max={todayStr} min={startOfSystem} />
                    <button onClick={handleCustomFilter} className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold">{t('invoiceHistory.filter')}</button>
                </div>
            </div>
        </div>
      </div>

      {/* --- VISTA MÓVIL (TARJETAS) --- */}
      <div className="md:hidden space-y-4">
        {filtered.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
                <AlertCircle size={32} className="mb-2 opacity-50 mx-auto"/>
                {t('invoiceHistory.noInvoicesInPeriod')}
            </div>
        ) : (
            filtered.map((inv) => (
                <div key={inv.id} className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    {/* Cabecera Tarjeta: Numero y Total */}
                    <div className="flex justify-between items-start mb-3 border-b pb-2 dark:border-gray-700">
                        <div>
                            <span className="text-xs font-bold text-gray-400">#{inv.invoice_number}</span>
                            <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                                <Clock size={12}/> {new Date(inv.transaction_date).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-lg font-black text-primary dark:text-white">
                                {parseFloat(inv.total_amount).toFixed(2)} Bs
                             </div>
                             <StatusBadge isAnnulled={inv.is_annulled} />
                        </div>
                    </div>

                    {/* Cuerpo Tarjeta: Detalles */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><User size={12}/> {t('invoiceHistory.client')}:</span>
                            <span className="text-sm font-bold dark:text-gray-200 truncate max-w-[150px]">{inv.client_name || "S/N"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">{t('invoiceHistory.nit')}:</span>
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{inv.client_nit || "0"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">{t('invoiceHistory.origin')}:</span>
                            <OriginBadge identifier={inv.order_identifier} type={filterType} />
                        </div>
                    </div>

                    {/* Footer Tarjeta: Botón Acción */}
                    <button 
                        onClick={() => handleReprint(inv.id)} 
                        className="w-full py-2 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 transition"
                    >
                        <Eye size={16} /> {t('invoiceHistory.viewTicket')}
                    </button>
                </div>
            ))
        )}
      </div>

      {/* --- VISTA DESKTOP (TABLA) --- */}
      <div className="hidden md:block bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
            {filtered.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-400 flex flex-col items-center"><AlertCircle size={32} className="mb-2 opacity-50"/>{t('invoiceHistory.noInvoicesInPeriod')}</td></tr>
            ) : (
                filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 font-bold">#{inv.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(inv.transaction_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                        <OriginBadge identifier={inv.order_identifier} type={filterType} />
                    </td>
                    <td className="px-6 py-4"><p className="font-bold dark:text-white uppercase">{inv.client_name || t('invoiceHistory.sn')}</p><p className="text-xs text-gray-400">{t('invoiceHistory.nit')}: {inv.client_nit || "0"}</p></td>
                    <td className="px-6 py-4 font-mono font-bold dark:text-white">{parseFloat(inv.total_amount).toFixed(2)} Bs</td>
                    <td className="px-6 py-4">
                        <StatusBadge isAnnulled={inv.is_annulled} />
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
                <div className="p-4 bg-white border-t flex flex-col sm:flex-row justify-center gap-4 print:hidden">
                    <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg w-full sm:w-auto">
                        <Printer size={20}/> {t('invoiceHistory.print')}
                    </button>
                    <button onClick={() => setSelectedInvoice(null)} className="px-6 py-3 bg-gray-200 font-bold rounded-xl hover:bg-gray-300 w-full sm:w-auto text-center">{t('invoiceHistory.close')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceHistory;