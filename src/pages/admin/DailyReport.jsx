import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import financeService from '../../services/financeService';
import analyticsService from '../../services/analyticsService';
import { 
    TrendingUp, Banknote, QrCode, CreditCard, Calendar, Utensils, 
    ShoppingBag, Loader2, Clock, User, CheckCircle2, AlertTriangle, XCircle 
} from 'lucide-react';

const DailyReport = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState(null);
  const [channels, setChannels] = useState(null);
  const [shifts, setShifts] = useState([]); // <--- NUEVO ESTADO: Turnos
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Cargamos TODO en paralelo: Reporte Global, Canales y Turnos
      const [reportData, channelData, shiftsData] = await Promise.all([
          financeService.getDailyReport(),
          analyticsService.getDayChannels(),
          financeService.getDailyShifts() // <--- Llamada nueva
      ]);
      setReport(reportData);
      setChannels(channelData);
      setShifts(shiftsData || []);
    } catch (error) {
      console.error(t("dailyReport.errorLoadingReport"), error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
      if (!dateStr) return '--:--';
      return new Date(dateStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>;
  if (!report) return <div className="p-10 text-center text-gray-500">{t("dailyReport.noDataAvailable")}</div>;

  const getIcon = (method) => {
    if (method === 'QR') return <QrCode className="text-purple-500" />;
    if (method === 'TARJETA') return <CreditCard className="text-blue-500" />;
    return <Banknote className="text-green-500" />;
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      
      {/* 1. HEADER GLOBAL */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800 dark:from-dark-card dark:to-gray-900 p-6 rounded-3xl shadow-xl text-white">
        <div>
            <h2 className="text-3xl font-black flex items-center gap-3">
                <TrendingUp size={32} className="text-green-400"/> {t("dailyReport.cashSummary")}
            </h2>
            <p className="opacity-70 mt-1 flex items-center gap-2 font-medium">
                <Calendar size={16}/> {new Date().toLocaleDateString()}
            </p>
        </div>
        <div className="text-right mt-4 md:mt-0 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">{t("dailyReport.totalCollected")}</p>
            <p className="text-4xl font-black tracking-tight">{report.grand_total} {report.currency || 'Bs'}</p>
        </div>
      </div>

      {/* 2. NUEVA SECCIÓN: HISTORIAL DE TURNOS (ARQUEOS) */}
      <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="text-primary"/> Historial de Turnos (Caja)
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
              {shifts.length === 0 ? (
                  <div className="p-8 bg-gray-50 dark:bg-dark-card rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                      No hay turnos registrados hoy.
                  </div>
              ) : (
                  shifts.map((shift) => (
                      <div key={shift.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
                          
                          {/* Estado Visual (Barra lateral de color) */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${shift.status === 'open' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>

                          {/* Info Apertura */}
                          <div className="flex items-center gap-4 flex-1">
                              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold">
                                  <User size={20}/>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500 font-bold uppercase">Apertura ({formatTime(shift.opened_at)})</p>
                                  <p className="font-bold text-gray-800 dark:text-white text-lg">{shift.opened_by}</p>
                                  <p className="text-xs text-gray-400">Base: <span className="font-mono text-gray-600 dark:text-gray-300">{shift.starting_cash} Bs</span></p>
                              </div>
                          </div>

                          {/* Flecha de tiempo */}
                          <div className="hidden lg:flex flex-col items-center opacity-30">
                              <span className="text-[10px] font-mono mb-1">TURNO #{shift.id}</span>
                              <div className="w-24 h-0.5 bg-gray-400"></div>
                          </div>

                          {/* Info Cierre */}
                          <div className="flex items-center gap-4 flex-1 justify-end text-right">
                              <div>
                                  <p className="text-xs text-gray-500 font-bold uppercase">
                                      {shift.status === 'open' ? 'En Curso...' : `Cierre (${formatTime(shift.closed_at)})`}
                                  </p>
                                  {shift.status === 'open' ? (
                                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold mt-1">
                                          CAJA ABIERTA
                                      </span>
                                  ) : (
                                      <>
                                          <p className="font-bold text-gray-800 dark:text-white text-lg">{shift.closed_by}</p>
                                          {/* DIFERENCIA (El dato clave) */}
                                          <div className={`text-sm font-bold flex items-center justify-end gap-1 mt-1 ${shift.difference === 0 ? 'text-green-600' : shift.difference < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                              {shift.difference === 0 ? <CheckCircle2 size={14}/> : shift.difference < 0 ? <XCircle size={14}/> : <AlertTriangle size={14}/>}
                                              {shift.difference === 0 ? 'Cuadre Perfecto' : `${shift.difference > 0 ? '+' : ''}${shift.difference} Bs`}
                                          </div>
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3. VS CANALES (MESAS vs PEDIDOS) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {channels && (
                  <>
                    <ChannelCard 
                        title={t("dailyReport.tablesDineIn")}
                        data={channels.dine_in} 
                        icon={<Utensils size={24}/>} 
                        color="text-orange-600" 
                        bgColor="bg-orange-50"
                        isWinner={channels.winner === 'Mesas'}
                        t={t}
                    />
                    <ChannelCard 
                        title={t("dailyReport.ordersToTakeAway")}
                        data={channels.pickup} 
                        icon={<ShoppingBag size={24}/>} 
                        color="text-blue-600" 
                        bgColor="bg-blue-50"
                        isWinner={channels.winner === 'Pedidos' || channels.winner === 'Pickup'}
                        t={t}
                    />
                  </>
              )}
          </div>

          {/* 4. MÉTODOS DE PAGO (Resumen Vertical) */}
          <div className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-4 text-sm uppercase">Desglose de Pagos</h4>
              <div className="space-y-3">
                  {report.breakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <div className="flex items-center gap-3">
                              {getIcon(item.method)}
                              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{item.method}</span>
                          </div>
                          <div className="text-right">
                              <span className="block font-black text-gray-800 dark:text-white">{item.total} Bs</span>
                              <span className="text-[10px] text-gray-400">{item.count} trans.</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

// Componente visual para las tarjetas VS
const ChannelCard = ({ title, data, icon, color, bgColor, isWinner, t }) => (
    <div className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all ${isWinner ? 'bg-white border-green-400 shadow-md ring-2 ring-green-50' : 'bg-white border-gray-100 dark:bg-dark-card dark:border-gray-700'}`}>
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</span>
            </div>
            <p className="text-3xl font-black text-gray-800 dark:text-white">{data?.total || 0} Bs</p>
            <p className="text-xs text-gray-400 font-bold mt-1">{data?.count || 0} {t("dailyReport.accountsAttended")}</p>
        </div>
        {isWinner && (
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-yellow-100 rounded-full">
                <span className="text-xl">🏆</span>
            </div>
        )}
    </div>
);

export default DailyReport;