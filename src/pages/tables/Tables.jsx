import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTables } from '../../hooks/useTables';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal'; // 🔥 Restauramos el Modal
import { Armchair, Users, Loader2, Search, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';

const Tables = () => {
  const { t } = useTranslation();
  const { 
    tables, trash, isLoading: loadingTables, 
    createTable, updateTable, deleteTable, restoreTable,
    isCreating // Este estado nos dirá si está guardando
  } = useTables();
  
  const { openTable } = useOrders(); 
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  // ESTADOS DE UI
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'trash'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

  // ESTADOS DE FORMULARIO
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('');

  // PERMISOS
  const isAdmin = hasRole(['admin', 'super-admin']);

  const handleTableClick = async (table) => {
      if (table.status === 'occupied') {
          const orderWaiterId = table.current_order?.waiter_id || table.current_order?.waiter?.id;
          const isOwner = String(orderWaiterId) === String(user?.id);
          if (isAdmin || isOwner || !orderWaiterId) {
              navigate(`/orders/${table.current_order_id}`);
          } else {
              Swal.fire({ title: t('tables.accessRestrictedTitle'), text: t('tables.accessRestrictedText'), icon: 'warning' });
          }
      } else if (table.status === 'available') {
          const result = await Swal.fire({
              title: t('tables.openTableQuestion', { tableNumber: table.table_number }),
              icon: 'question', showCancelButton: true, confirmButtonText: t('tables.yesOpen'), confirmButtonColor: '#10B981'
          });
          if (result.isConfirmed) {
              try {
                  const newOrder = await openTable(table.id);
                  navigate(`/orders/${newOrder.id}`);
              } catch (error) { Swal.fire(t('tables.error'), t('tables.couldNotOpenTable'), 'error'); }
          }
      }
  };

  // ACCIONES ADMIN
  const handleOpenCreate = () => {
      setEditingTable(null);
      setTableNumber('');
      setCapacity('');
      setIsModalOpen(true);
  };

  const handleOpenEdit = (table) => {
      setEditingTable(table);
      setTableNumber(table.table_number);
      setCapacity(table.capacity);
      setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      const payload = { table_number: tableNumber, capacity: parseInt(capacity) };
      try {
          if (editingTable) await updateTable({ id: editingTable.id, ...payload });
          else await createTable(payload);
          setIsModalOpen(false);
      } catch (err) { console.error(err); }
  };

  const handleDelete = (id) => {
      Swal.fire({ title: t('tables.deleteConfirmation'), icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: t('tables.yes') })
      .then((r) => { if (r.isConfirmed) deleteTable(id); });
  };

  const sourceData = viewMode === 'active' ? tables : trash;
  const filteredTables = sourceData.filter(table => {
      const matchesSearch = table.table_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || table.status === filterStatus;
      return matchesSearch && (viewMode === 'trash' ? true : matchesStatus);
  });

  if (loadingTables) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER CON BOTONES ADMIN */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Armchair className="text-primary"/> {viewMode === 'active' ? t('tables.tableManagement') : t('tables.deletedTables')}
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
              {/* Selector de Papelera solo para Admin */}
              {isAdmin && (
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                      <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'active' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('categories.active')}</button>
                      <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'trash' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>{t('tables.trash')}</button>
                  </div>
              )}

              <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <input type="text" placeholder={t('tables.searchTablePlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white"/>
              </div>

              {viewMode === 'active' && isAdmin && (
                  <button onClick={handleOpenCreate} className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-bold flex gap-2 items-center shadow-lg transition active:scale-95">
                      <Plus size={18}/> {t('tables.newTable')}
                  </button>
              )}
          </div>
      </div>

      {/* FILTROS DE ESTADO (Solo en modo activo) */}
      {viewMode === 'active' && (
          <div className="flex bg-white dark:bg-dark-card p-1 rounded-xl border w-fit">
              <button onClick={() => setFilterStatus('all')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'all' ? 'bg-indigo-50 text-primary' : 'text-gray-500'}`}>{t('orderManager.all')}</button>
              <button onClick={() => setFilterStatus('occupied')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'occupied' ? 'bg-red-50 text-red-500' : 'text-gray-500'}`}>{t('tables.filterOccupied')}</button>
              <button onClick={() => setFilterStatus('available')} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${filterStatus === 'available' ? 'bg-green-50 text-green-500' : 'text-gray-500'}`}>{t('tables.filterFree')}</button>
          </div>
      )}
      
      {/* GRID DE MESAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map((table) => (
            <div key={table.id} className={`relative p-4 rounded-2xl border-2 transition-all shadow-sm group ${table.status === 'occupied' ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'bg-white dark:bg-dark-card border-gray-100 hover:border-primary'}`}>
                
                {/* BOTONES DE ACCIÓN (Aparecen al hacer hover) */}
                {isAdmin && viewMode === 'active' && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(table); }} className="p-1.5 bg-white shadow-sm border rounded-lg text-blue-600 hover:bg-blue-50"><Pencil size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(table.id); }} className="p-1.5 bg-white shadow-sm border rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                    </div>
                )}

                <div onClick={() => viewMode === 'active' && handleTableClick(table)} className="cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-lg font-black text-gray-800 dark:text-white">{table.table_number}</span>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{table.capacity}p</span>
                    </div>
                    <div className="flex flex-col items-center py-4">
                        <Armchair size={40} className={table.status === 'occupied' ? 'text-red-400' : 'text-green-400'} />
                        <span className={`text-[10px] font-bold uppercase mt-2 ${table.status === 'occupied' ? 'text-red-500' : 'text-green-500'}`}>
                            {viewMode === 'trash' ? t('tables.trash') : (table.status === 'occupied' ? t('tables.serving') : t('tables.available'))}
                        </span>
                    </div>
                    {viewMode === 'trash' && isAdmin && (
                        <button onClick={() => restoreTable(table.id)} className="w-full mt-2 py-2 bg-green-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1"><RotateCcw size={12}/> {t('tables.restore')}</button>
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* MODAL CREAR / EDITAR */}
      <Modal isOpen={isModalOpen} onClose={() => !isCreating && setIsModalOpen(false)} title={editingTable ? t('tables.editTable') : t('tables.newTable')}>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">{t('tables.identifier')}</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                    value={tableNumber} 
                    onChange={e=>setTableNumber(e.target.value)} 
                    placeholder="Ej: Mesa 5"
                    disabled={isCreating} // Bloqueamos input mientras carga
                  />
              </div>
              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">{t('tables.capacity')}</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                    value={capacity} 
                    onChange={e=>setCapacity(e.target.value)}
                    disabled={isCreating} // Bloqueamos input mientras carga
                  />
              </div>
              
              {/* 🔥 BOTÓN CON LOADER DINÁMICO 🔥 */}
              <button 
                type="submit" 
                disabled={isCreating} 
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition active:scale-95 flex justify-center items-center gap-2"
              >
                  {isCreating ? (
                      <>
                          <Loader2 className="animate-spin" size={20}/>
                          <span>Guardando...</span>
                      </>
                  ) : (
                      editingTable ? t('tables.save') : t('tables.save')
                  )}
              </button>
          </form>
      </Modal>

    </div>
  );
};

export default Tables;