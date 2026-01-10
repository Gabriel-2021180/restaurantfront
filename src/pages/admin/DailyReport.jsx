import { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService';
import analyticsService from '../../services/analyticsService'; // Importar Analytics
import { TrendingUp, Banknote, QrCode, CreditCard, Calendar, Utensils, ShoppingBag, Loader2 } from 'lucide-react';

const DailyReport = () => {
  const [report, setReport] = useState(null);
  const [channels, setChannels] = useState(null); // Nuevo estado para canales
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Carga paralela para velocidad
      const [reportData, channelData] = await Promise.all([
          financeService.getDailyReport(),
          analyticsService.getDayChannels()
      ]);
      setReport(reportData);
      setChannels(channelData);
    } catch (error) {
      console.error("Error cargando reporte", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>;

  if (!report) return <div className="p-10 text-center text-gray-500">No hay datos disponibles para hoy.</div>;

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

      {/* --- NUEVO: VS CANALES (MESAS vs PEDIDOS) --- */}
      {channels && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChannelCard 
                  title="Mesas (Comedor)" 
                  data={channels.dine_in} 
                  icon={<Utensils size={24}/>} 
                  color="text-orange-600" 
                  bgColor="bg-orange-50"
                  isWinner={channels.winner === 'Mesas'}
              />
              <ChannelCard 
                  title="Pedidos (Para Llevar)" 
                  data={channels.pickup} 
                  icon={<ShoppingBag size={24}/>} 
                  color="text-blue-600" 
                  bgColor="bg-blue-50"
                  isWinner={channels.winner === 'Pedidos' || channels.winner === 'Pickup'}
              />
          </div>
      )}

      {/* CARDS DE MÉTODOS DE PAGO */}
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
    </div>
  );
};

// Componente visual para las tarjetas VS
const ChannelCard = ({ title, data, icon, color, bgColor, isWinner }) => (
    <div className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all ${isWinner ? 'bg-white border-green-400 shadow-md ring-2 ring-green-50' : 'bg-white border-gray-100 dark:bg-dark-card dark:border-gray-700'}`}>
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</span>
                <span className="text-sm font-bold text-gray-500 uppercase">{title}</span>
            </div>
            <p className="text-3xl font-black text-gray-800 dark:text-white">{data?.total || 0} Bs</p>
            <p className="text-xs text-gray-400 font-bold mt-1">{data?.count || 0} cuentas atendidas</p>
        </div>
        {isWinner && (
            <div className="text-center">
                <span className="text-2xl">🏆</span>
                <p className="text-[10px] font-black text-green-600 uppercase">Líder</p>
            </div>
        )}
    </div>
);

export default DailyReport;