import { useState } from 'react'; // 🔥 Quitamos useEffect que no se usa
import { useTranslation } from 'react-i18next';
import { useTables } from '../../hooks/useTables';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Armchair, Users, Loader2, Search } from 'lucide-react';
import Swal from 'sweetalert2';

const Tables = () => {
  const { t } = useTranslation();
  
  // useTables YA CARGA LOS DATOS AUTOMÁTICAMENTE
  const { tables, isLoading: loadingTables } = useTables();
  
  const { openTable } = useOrders(); 
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 

  // ❌ ELIMINADO: useEffect(() => { loadTables() }, []) 
  // Esto causaba la petición doble y el error 429.

  const handleTableClick = async (table) => {
      // 1. SI ESTÁ OCUPADA -> VERIFICAR PERMISOS
      if (table.status === 'occupied') {
          // A) Obtener ID del Mesero Responsable
          const orderWaiterId = table.current_order?.waiter_id || table.current_order?.waiter?.id;
          const myId = user?.id;

          // B) Verificaciones
          const isAdmin = hasRole(['admin', 'super-admin']);
          const isOwner = String(orderWaiterId) === String(myId);
          const isDataMissing = !orderWaiterId; 

          if (isAdmin || isOwner || isDataMissing) {
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
      // 2. SI ESTÁ DISPONIBLE -> ABRIR MESA
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
                  const newOrder = await openTable(table.id);
                  navigate(`/orders/${newOrder.id}`);
              } catch (error) {
                  console.error(error);
                  Swal.fire(t('tables.error'), t('tables.couldNotOpenTable'), 'error');
              }
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

              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'all' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('orderManager.all')}</button>
                  <button onClick={() => setFilterStatus('occupied')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'occupied' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>{t('tables.filterOccupied')}</button>
                  <button onClick={() => setFilterStatus('available')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'available' ? 'bg-white shadow text-green-500' : 'text-gray-500'}`}>{t('tables.filterFree')}</button>
              </div>
          </div>
      </div>
      
      {/* GRID DE MESAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map((table) => {
            const isOccupied = table.status === 'occupied';
            const isAvailable = table.status === 'available';
            
            return (
                <div 
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    className={`
                        relative p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md group select-none
                        ${isAvailable ? 'bg-white dark:bg-dark-card border-gray-200 dark:border-gray-700 hover:border-green-400' : ''}
                        ${isOccupied ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 hover:border-red-400' : ''}
                    `}
                >
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
                            {isOccupied ? t('tables.serving') : t('tables.available')}
                        </span>
                        {isOccupied && table.current_order?.waiter && (
                            <span className="text-[10px] text-gray-400 mt-1 truncate max-w-full">
                                {table.current_order.waiter.first_names}
                            </span>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Tables;