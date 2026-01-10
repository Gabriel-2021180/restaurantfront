import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTables } from '../../hooks/useTables';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext'; // IMPORTANTE
import Modal from '../../components/ui/Modal';
import { Plus, Search, Archive, Users, RotateCcw, Pencil, Trash2, Loader2, Square, Armchair, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';

const Tables = () => {
  const { tables, trash, isLoading, isCreating, createTable, updateTable, deleteTable, restoreTable } = useTables();
  const navigate = useNavigate();
  const { openTable } = useOrders();
  const queryClient = useQueryClient();
  
  // --- AUTH HOOK (SEGURIDAD) ---
  const { hasRole, user } = useAuth(); // TRAEMOS EL USUARIO
  const isAdmin = hasRole(['super-admin', 'admin']);

  // ESTADOS
  const [viewMode, setViewMode] = useState('active'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // FORMULARIO
  const [form, setForm] = useState({ table_number: '', capacity: '' });

  const sourceData = viewMode === 'active' ? tables : trash;
  
  const filteredList = sourceData.filter(t => 
    t.table_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ... (ResetForm, Handles igual que antes) ...
  const resetForm = () => { setEditingTable(null); setForm({ table_number: '', capacity: '' }); };
  const handleOpenCreate = () => { resetForm(); setIsModalOpen(true); };
  const handleOpenEdit = (table) => { setEditingTable(table); setForm({ table_number: table.table_number, capacity: table.capacity }); setIsModalOpen(true); };
  const handleDelete = (id, status) => { if (status === 'occupied') return Swal.fire('Alto ahí', 'Mesa ocupada.', 'warning'); Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' }).then((r) => { if(r.isConfirmed) deleteTable(id) }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { table_number: form.table_number, capacity: parseInt(form.capacity) || 2 };
      if (editingTable) await updateTable({ id: editingTable.id, ...payload });
      else await createTable(payload);
      setIsModalOpen(false);
    } catch (error) { console.error(error); }
  };

  // --- LÓGICA DE CLICK EN MESA (AQUÍ ESTÁ LA SEGURIDAD) ---
  const handleTableClick = async (table) => {
        if (viewMode === 'trash') return;

        if (table.status === 'occupied') {
            // 1. VALIDACIÓN DE PROPIEDAD
            // Si NO soy admin Y la mesa tiene un mesero asignado Y ese mesero NO soy yo...
            if (!isAdmin && table.current_waiter_id && table.current_waiter_id !== user.id) {
                return Swal.fire({
                    title: 'Acceso Restringido',
                    text: 'Esta mesa está siendo atendida por otro compañero.',
                    icon: 'warning',
                    confirmButtonText: 'Entendido'
                });
            }

            if (table.current_order_id) {
                navigate(`/orders/${table.current_order_id}`);
            } else {
                // Caso raro: Ocupada pero sin ID de orden en el front (Sync error)
                await queryClient.invalidateQueries(['tables']);
            }
        } else {
            // ABRIR MESA
            const result = await Swal.fire({
                title: `¿Abrir ${table.table_number}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Sí, abrir'
            });

            if (result.isConfirmed) {
                Swal.fire({ title: 'Abriendo...', didOpen: () => Swal.showLoading() });
                try {
                    const newOrder = await openTable(table.id);
                    const targetId = newOrder?.id || newOrder?.data?.id;
                    if (targetId) {
                        Swal.close();
                        navigate(`/orders/${targetId}`);
                    }
                } catch (error) {
                    Swal.fire('Error', 'No se pudo abrir la mesa.', 'error');
                }
            }
        }
    };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Armchair className="text-primary" /> {viewMode === 'active' ? 'Gestión de Mesas' : 'Mesas Eliminadas'}
        </h2>
        
        <div className="flex gap-3 w-full xl:w-auto">
            {isAdmin && ( 
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'active' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Piso</button>
                    <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${viewMode === 'trash' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}><Archive size={16} /></button>
                </div>
            )}
            
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar mesa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white"/>
            </div>

            {viewMode === 'active' && isAdmin && ( 
                <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                    <Plus size={18} /> <span className="hidden sm:inline">Nueva Mesa</span>
                </button>
            )}
        </div>
      </div>

      {/* GRID DE MESAS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredList.map((table) => {
            const isOccupied = table.status === 'occupied';
            // Validamos visualmente si la mesa es mía o no
            const isMyTable = table.current_waiter_id === user.id;
            const isLocked = isOccupied && !isMyTable && !isAdmin;

            const bgClass = isOccupied 
                ? (isLocked ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 opacity-75' : 'bg-red-50 dark:bg-red-900/10 border-red-200') 
                : 'bg-white dark:bg-dark-card border-gray-100 dark:border-gray-700';

            return (
                <div 
                    key={table.id} 
                    onClick={() => handleTableClick(table)}
                    className={`relative p-5 rounded-2xl border-2 transition-all hover:shadow-md group cursor-pointer ${bgClass} ${isOccupied ? 'border-red-400 dark:border-red-800' : 'hover:border-primary/50'}`}
                >
                    
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-lg text-gray-800 dark:text-gray-100">{table.table_number}</span>
                        {/* Indicador de estado */}
                        {isLocked ? (
                            <Lock size={16} className="text-gray-400"/>
                        ) : (
                            <span className={`w-3 h-3 rounded-full ${isOccupied ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                        )}
                    </div>

                    <div className="flex justify-center my-4 opacity-80">
                         <div className={`relative w-16 h-16 rounded-lg flex items-center justify-center ${isOccupied ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                            <Square size={32} />
                            {/* Decoración silla */}
                            <div className="absolute -top-1 w-8 h-1 bg-gray-300 rounded-full"></div>
                            <div className="absolute -bottom-1 w-8 h-1 bg-gray-300 rounded-full"></div>
                         </div>
                    </div>

                    <div className="text-center mb-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                            <Users size={12} /> {table.capacity} personas
                        </span>
                        {isOccupied && (
                            <p className={`text-xs font-bold mt-1 ${isLocked ? 'text-gray-500' : 'text-red-500'}`}>
                                {isLocked ? 'OCUPADA (Otro)' : 'ATENDIENDO'}
                            </p>
                        )}
                    </div>

                    {/* ACCIONES (SOLO ADMIN) */}
                    {isAdmin && (
                        <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {viewMode === 'active' ? (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(table); }} className="p-2 bg-white shadow-sm border rounded-lg hover:text-blue-600"><Pencil size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(table.id, table.status); }} className="p-2 bg-white shadow-sm border rounded-lg hover:text-red-600"><Trash2 size={14}/></button>
                                </>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); restoreTable(table.id); }} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold"><RotateCcw size={14}/> Restaurar</button>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTable ? "Editar Mesa" : "Nueva Mesa"}>
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* ... Formulario igual ... */}
            <div><label className="text-sm font-bold">Identificador</label><input type="text" required autoFocus className="input-base w-full p-3 border rounded-xl" value={form.table_number} onChange={e => setForm({...form, table_number: e.target.value})} /></div>
            <div><label className="text-sm font-bold">Capacidad</label><input type="number" required min="1" className="input-base w-full p-3 border rounded-xl" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
            <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl">Cancelar</button>
                <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl">{isCreating ? <Loader2 className="animate-spin"/> : 'Guardar'}</button>
            </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tables;