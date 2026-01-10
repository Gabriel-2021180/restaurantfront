import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import Modal from '../../components/ui/Modal';
import { Plus, Search, Pencil, Trash2, RotateCcw, Archive, Layers, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

const Categories = () => {
  const { 
    categories, trash, isLoading, 
    createCategory, updateCategory, deleteCategory, restoreCategory 
  } = useCategories();
  
  // ESTADOS
  const [viewMode, setViewMode] = useState('active'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // --- 1. ESTADO DE CARGA AGREGADO ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // FORMULARIO
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const sourceData = viewMode === 'active' ? categories : trash;
  const filteredList = sourceData.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // MANEJADORES
  const resetForm = () => {
    setName('');
    setDescription('');
    setIsActive(true);
    setEditingCategory(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsActive(cat.is_active !== false); 
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: '¿Desactivar Categoría?',
      html: `
        <div class="text-left text-sm text-gray-600 dark:text-gray-300">
          <p class="mb-2">Estás a punto de enviar esta categoría a la papelera.</p>
          <p class="font-bold text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
            ⚠️ ¡CUIDADO! <br/>
            Todos los productos asociados a esta categoría también podrían desactivarse o quedar ocultos en el menú.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, borrar y desactivar productos',
      cancelButtonText: 'Cancelar'
    }).then((r) => { if (r.isConfirmed) deleteCategory(id); });
  };

  const handleRestore = (id) => {
    Swal.fire({
      title: '¿Restaurar categoría?',
      text: "Volverá a estar visible en el menú.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Sí, restaurar'
    }).then((r) => { if (r.isConfirmed) restoreCategory(id); });
  };

  // --- 2. SUBMIT CON CONTROL DE CARGA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si ya está cargando, no hacemos nada (Evita doble clic)
    if (isSubmitting) return;

    setIsSubmitting(true); // Bloqueamos

    try {
      const payload = { 
        name: name.trim(),
        description: description ? description.trim() : null,
        //is_active: isActive // Mantenemos comentado como en tu versión original
      };

      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...payload });
      } else {
        await createCategory(payload);
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (error) { 
      console.error(error);
    } finally {
      setIsSubmitting(false); // Desbloqueamos siempre
    }
  };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layers className="text-primary" />
            {viewMode === 'active' ? 'Categorías del Menú' : 'Categorías Archivadas'}
        </h2>
        
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'active' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary dark:text-white' : 'text-gray-500'}`}>Activas</button>
                <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${viewMode === 'trash' ? 'bg-white dark:bg-gray-600 shadow-sm text-red-500' : 'text-gray-500'}`}><Archive size={16} /> Papelera</button>
            </div>
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar sección..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white transition-all"/>
            </div>
            {viewMode === 'active' && (
                <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                    <Plus size={18} /> <span className="hidden sm:inline">Nueva</span>
                </button>
            )}
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Descripción</th>
                
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredList.length > 0 ? (
                filteredList.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">{cat.name}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{cat.description || '-'}</td>
                    
                    <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                        {viewMode === 'active' ? (
                            <>
                            <button onClick={() => handleOpenEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                            <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                            </>
                        ) : (
                            <button onClick={() => handleRestore(cat.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg flex items-center gap-1 font-bold text-xs"><RotateCcw size={16}/> Restaurar</button>
                        )}
                        </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (Con inputs bloqueados al cargar) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nombre</label>
            <input 
                type="text" 
                required 
                autoFocus 
                className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ej: Bebidas, Postres..." 
                disabled={isSubmitting} // Bloquear
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Descripción (Opcional)</label>
            <textarea 
                rows="2" 
                className="input-base w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white resize-none" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                disabled={isSubmitting} // Bloquear
            ></textarea>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <input 
                type="checkbox" 
                id="isActiveCheck"
                checked={isActive} 
                onChange={e => setIsActive(e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
                disabled={isSubmitting} // Bloquear
            />
            <label htmlFor="isActiveCheck" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                Mostrar categoría en el menú
            </label>
          </div>

          <div className="pt-2 flex gap-3">
            <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 font-bold rounded-xl"
                disabled={isSubmitting}
            >
                Cancelar
            </button>
            <button 
                type="submit" 
                disabled={isSubmitting} 
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition flex justify-center items-center gap-2"
            >
                {/* 3. LOGICA VISUAL DEL LOADER */}
                {isSubmitting ? (
                    <>
                        <Loader2 className="animate-spin" size={20}/>
                        <span>Guardando...</span>
                    </>
                ) : (
                    editingCategory ? 'Guardar' : 'Crear'
                )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Categories;