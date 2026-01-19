import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, User, DollarSign, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useCashRegister } from '../../hooks/useCashRegister'; 
import Modal from '../../components/ui/Modal';

const ShiftHistory = () => {
  const { t } = useTranslation();
  const { getDailyShifts } = useCashRegister();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => {
    loadShifts();
  }, [selectedDate]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await getDailyShifts(selectedDate);
      setShifts(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Clock className="text-primary" /> {t('shiftHistory.title')}
            </h2>
            <p className="text-sm text-gray-500">{t('shiftHistory.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl">
            <Calendar size={18} className="text-gray-500"/>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 dark:text-gray-300"
            />
        </div>
      </div>

      {/* LISTA DE TURNOS */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
            <div className="p-8 text-center text-gray-500">{t('shiftHistory.loading')}</div>
        ) : shifts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                <Info size={32} className="text-gray-300"/>
                {t('shiftHistory.noRecords')}
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500">
                        <tr>
                            <th className="px-6 py-4">{t('shiftHistory.status')}</th>
                            <th className="px-6 py-4">{t('shiftHistory.responsible')}</th>
                            <th className="px-6 py-4">{t('shiftHistory.schedule')}</th>
                            <th className="px-6 py-4 text-right">{t('shiftHistory.startingCash')}</th>
                            <th className="px-6 py-4 text-right">{t('shiftHistory.cashSales')}</th>
                            <th className="px-6 py-4 text-right">{t('shiftHistory.difference')}</th>
                            <th className="px-6 py-4 text-center">{t('shiftHistory.details')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {shifts.map((shift) => {
                            const isAutoClosed = shift.status === 'closed' && !shift.closedBy; 
                            const diff = parseFloat(shift.difference || 0);
                            
                            return (
                                <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-4">
                                        {shift.status === 'open' ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> {t('shiftHistory.open')}
                                            </span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-xs font-bold flex w-fit items-center gap-1 ${isAutoClosed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {isAutoClosed ? `🤖 ${t('shiftHistory.auto')}` : `🔒 ${t('shiftHistory.closed')}`}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {shift.openedBy?.first_names?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    {shift.openedBy?.first_names} {shift.openedBy?.last_names}
                                                </p>
                                                {isAutoClosed && <p className="text-[10px] text-red-500 font-bold">{t('shiftHistory.systemClose')}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {formatTime(shift.opened_at)} - {shift.closed_at ? formatTime(shift.closed_at) : '...'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-700 dark:text-gray-300">
                                        {shift.starting_cash} {t('common.currency')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                                        + {shift.total_cash_sales || 0} {t('common.currency')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-mono font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                                            {diff > 0 ? '+' : ''}{diff} {t('common.currency')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setSelectedShift(shift)}
                                            className="text-primary hover:text-primary-dark hover:bg-blue-50 p-2 rounded-lg transition"
                                        >
                                            <Info size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {selectedShift && (
          <Modal isOpen={!!selectedShift} onClose={() => setSelectedShift(null)} title={t('shiftHistory.modalTitle')}>
              <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{t('shiftHistory.closingNotes')}</h4>
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                          {selectedShift.notes || t('shiftHistory.noNotes')}
                      </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs text-blue-600 font-bold">{t('shiftHistory.digitalSales')}</div>
                            <div className="text-lg font-bold text-blue-800">{selectedShift.total_digital_sales || 0} {t('common.currency')}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-xs text-green-600 font-bold">{t('shiftHistory.totalCashSales')}</div>
                            <div className="text-lg font-bold text-green-800">{selectedShift.total_cash_sales || 0} {t('common.currency')}</div>
                        </div>
                  </div>

                  {selectedShift.difference < 0 && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                          <AlertTriangle className="text-red-500 shrink-0" size={20}/>
                          <div>
                              <p className="text-sm font-bold text-red-700">{t('shiftHistory.negativeDifference')} ({selectedShift.difference} {t('common.currency')})</p>
                              <p className="text-xs text-red-600">
                                  {selectedShift.closedBy ? 
                                    t('shiftHistory.missingManual') : 
                                    t('shiftHistory.missingAuto')
                                  }
                              </p>
                          </div>
                      </div>
                  )}
              </div>
          </Modal>
      )}
    </div>
  );
};

export default ShiftHistory;