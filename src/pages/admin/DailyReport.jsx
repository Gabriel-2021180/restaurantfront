import { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService';
import { TrendingUp, Banknote, QrCode, CreditCard, Calendar, DollarSign, Loader2 } from 'lucide-react';

const DailyReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      const data = await financeService.getDailyReport();
      setReport(data);
    } catch (error) {
      console.error("Error cargando reporte", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>;

  if (!report) return <div className="p-10 text-center text-gray-500">No hay datos disponibles para hoy.</div>;

  // Iconos según el método
  const getIcon = (method) => {
    if (method === 'QR') return <QrCode className="text-purple-500" />;
    if (method === 'TARJETA') return <CreditCard className="text-blue-500" />;
    return <Banknote className="text-green-500" />;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-primary to-indigo-600 p-6 rounded-3xl shadow-lg text-white">
        <div>
            <h2 className="text-3xl font-black flex items-center gap-3">
                <TrendingUp size={32}/> Resumen de Caja
            </h2>
            <p className="opacity-90 mt-1 flex items-center gap-2">
                <Calendar size={16}/> {new Date().toLocaleDateString()}
            </p>
        </div>
        <div className="text-right mt-4 md:mt-0 bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
            <p className="text-sm font-bold uppercase tracking-wider opacity-80">Total Recaudado</p>
            <p className="text-4xl font-black">{report.grand_total} {report.currency || 'Bs'}</p>
        </div>
      </div>

      {/* CARDS DE MÉTODOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {report.breakdown.map((item, index) => (
            <div key={index} className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        {getIcon(item.method)}
                    </div>
                    <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-500 dark:text-gray-300">
                        {item.count} Pagos
                    </span>
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{item.method}</p>
                    <p className="text-3xl font-black text-gray-800 dark:text-white">
                        {item.total} <span className="text-sm text-gray-400 font-normal">Bs</span>
                    </p>
                </div>
            </div>
        ))}
      </div>

      {/* TABLA DETALLE (Opcional, si quieres ver más) */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
         <h3 className="font-bold text-gray-700 dark:text-white mb-4">Desglose porcentual</h3>
         <div className="space-y-4">
            {report.breakdown.map((item, index) => {
                const percent = (item.total / report.grand_total) * 100;
                return (
                    <div key={index}>
                        <div className="flex justify-between text-sm mb-1 font-medium text-gray-600 dark:text-gray-300">
                            <span>{item.method}</span>
                            <span>{percent.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                                className={`h-2.5 rounded-full ${item.method === 'QR' ? 'bg-purple-500' : item.method === 'TARJETA' ? 'bg-blue-500' : 'bg-green-500'}`} 
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
         </div>
      </div>
    </div>
  );
};

export default DailyReport;