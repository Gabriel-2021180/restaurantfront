import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTables } from '../../hooks/useTables';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Armchair, Users, Loader2, DollarSign, Search 
} from 'lucide-react';
import Swal from 'sweetalert2';

const Tables = () => {
  const { t } = useTranslation();
  const { tables, loadTables, isLoading: loadingTables } = useTables();
  
  // 1. CORRECCIÓN: Usamos 'openTable' que es el nombre real en el hook
  const { openTable, closeOrderAndFreeTable } = useOrders(); 
  
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [releasingTableId, setReleasingTableId] = useState(null); 

  useEffect(() => {
    loadTables();
  }, []);

  const handleTableClick = async (table) => {
      if (table.status === 'occupied') {
          const canAccess = hasRole(['admin', 'super-admin']) || table.current_order?.waiter_id === user.id;

          if (canAccess) {
              navigate(`/orders/${table.current_order_id}`);
          } else {
              Swal.fire({
                  title: t('tables.accessRestrictedTitle'),
                  text: t('tables.accessRestrictedText'),
                  icon: 'warning',
                  confirmButtonText: t('tables.understood')
              });
          }
      } 
      else if (table.status === 'available') {
          const result = await Swal.fire({
              title: t('tables.openTableQuestion', { tableNumber: table.table_number }),
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: t('tables.yesOpen'),
              cancelButtonText: t('tables.cancel'),
              confirmButtonColor: '#10B981'
          });

          if (result.isConfirmed) {
              try {
                  // 2. CORRECCIÓN: Usamos openTable y pasamos SOLO el ID
                  // El hook useOrders ya se encarga de armar el { table_id: id }
                  const newOrder = await openTable(table.id);
                  
                  navigate(`/orders/${newOrder.id}`);
              } catch (error) {
                  console.error(error);
                  Swal.fire(t('tables.error'), t('tables.couldNotOpenTable'), 'error');
              }
          }
      }
  };

  const handleFreeTable = async (e, table) => {
      e.stopPropagation(); 
      const result = await Swal.fire({
          title: t('orderManager.releaseTable'),
          text: t('orderManager.accountGoesToCashier'),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: t('orderManager.yesRelease')
      });

      if (result.isConfirmed) {
          setReleasingTableId(table.id);
          try {
              await closeOrderAndFreeTable(table.current_order_id);
              await loadTables();
              Swal.fire({
                  icon: 'success',
                  title: '¡Listo!', // Usamos texto directo o t('common.success')
                  text: t('orderManager.tableReleasedForPayment'),
                  timer: 1500,
                  showConfirmButton: false
              });
          } catch (error) {
              console.error(error);
              Swal.fire('Error', t('orderManager.error'), 'error');
          } finally {
              setReleasingTableId(null);
          }
      }
  };

  const filteredTables = tables.filter(table => {
      const matchesSearch = table.table_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || table.status === filterStatus;
      return matchesSearch && matchesStatus;
  });

  if (loadingTables) return (
      <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-primary w-12 h-12"/>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-0">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Armchair className="text-primary"/> {t('tables.tableManagement')}
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <input 
                      type="text" 
                      placeholder={t('tables.searchTablePlaceholder')} 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white"
                  />
              </div>

              {/* FILTROS CORREGIDOS CON TRADUCCIÓN */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button 
                      onClick={() => setFilterStatus('all')} 
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'all' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                  >
                      {t('orderManager.all')}
                  </button>
                  <button 
                      onClick={() => setFilterStatus('occupied')} 
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'occupied' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}
                  >
                      {t('tables.filterOccupied')} {/* <--- AQUI */}
                  </button>
                  <button 
                      onClick={() => setFilterStatus('available')} 
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'available' ? 'bg-white shadow text-green-500' : 'text-gray-500'}`}
                  >
                      {t('tables.filterFree')} {/* <--- AQUI */}
                  </button>
              </div>
          </div>
      </div>
      
      {/* GRID DE MESAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map((table) => {
            const isReleasing = releasingTableId === table.id;
            const isOccupied = table.status === 'occupied';
            const isAvailable = table.status === 'available';
            const canManage = hasRole(['admin', 'super-admin']) || table.current_order?.waiter_id === user.id;

            return (
                <div 
                    key={table.id}
                    onClick={() => !isReleasing && handleTableClick(table)}
                    className={`
                        relative p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md group select-none
                        ${isReleasing ? 'bg-gray-100 border-gray-300 opacity-70 pointer-events-none' : ''} 
                        ${isAvailable ? 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 hover:border-green-400' : ''}
                        ${isOccupied ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 hover:border-red-400' : ''}
                    `}
                >
                    {isReleasing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-black/50 rounded-2xl z-20 backdrop-blur-sm">
                            <Loader2 className="animate-spin text-primary w-8 h-8 mb-2"/>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Procesando...</span>
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-lg font-black ${isOccupied ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                            {table.table_number}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                            <Users size={12}/> {table.capacity}p
                        </span>
                    </div>

                    <div className="flex flex-col items-center py-4">
                        <Armchair size={48} className={`mb-2 transition-colors duration-300 ${isOccupied ? 'text-red-400' : 'text-green-400'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wider ${isOccupied ? 'text-red-500' : 'text-green-500'}`}>
                            {/* AQUÍ SE USA LA TRADUCCIÓN CORREGIDA */}
                            {isOccupied ? t('tables.serving') : t('tables.available')}
                        </span>
                        {isOccupied && table.current_order?.waiter && (
                            <span className="text-[10px] text-gray-400 mt-1 truncate max-w-full">
                                {table.current_order.waiter.first_names}
                            </span>
                        )}
                    </div>

                    {isOccupied && canManage && (
                        <button 
                            onClick={(e) => handleFreeTable(e, table)}
                            disabled={isReleasing}
                            className="w-full mt-2 py-2.5 bg-white dark:bg-dark-bg border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-xs font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center gap-2 transition z-10 relative shadow-sm active:scale-95"
                        >
                            <DollarSign size={14}/> {t('orderManager.collectAccount')}
                        </button>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Tables;