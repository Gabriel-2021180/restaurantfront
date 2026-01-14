import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarketing } from '../../hooks/useMarketing';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { useAuth } from '../../context/AuthContext'; // <--- 1. IMPORTANTE
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { TicketPercent, Plus, Archive, RotateCcw, Pencil, Trash2, Loader2, Zap, Lock, Layers, Utensils } from 'lucide-react';
import Swal from 'sweetalert2';

const Promotions = () => {
  const { t } = useTranslation();
  const { discounts, trash, isLoadingData, isCreating, createDiscount, updateDiscount, deleteDiscount, restoreDiscount } = useMarketing();
  const { products } = useProducts();
  const { categories } = useCategories();
  
  // --- 2. VERIFICAR PERMISOS ---
  const { hasRole } = useAuth();
  // Solo los jefes pueden editar. El mesero solo ve.
  const isAdmin = hasRole(['super-admin', 'admin']);

  const [viewMode, setViewMode] = useState('active'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [strategy, setStrategy] = useState('date'); 
  const [target, setTarget] = useState('product'); 

  const [form, setForm] = useState({
    code: '', type: 'percentage', value: '', 
    product_id: '', category_id: '', 
    start_date: '', end_date: '', max_uses: ''
  });

  const sourceData = viewMode === 'active' ? discounts : trash;
  const filteredDiscounts = sourceData.filter(d => d.code?.toLowerCase().includes(searchTerm.toLowerCase()));

  const resetForm = () => {
    setStrategy('date');
    setTarget('product');
    setEditingId(null);
    setForm({
      code: '', type: 'percentage', value: '', 
      product_id: '', category_id: '', 
      start_date: new Date().toISOString().split('T')[0], 
      end_date: '', max_uses: ''
    });
  };

  const handleOpenCreate = () => { resetForm(); setIsModalOpen(true); };
  
  const handleOpenEdit = (promo) => {
    // PROTECCIÓN EXTRA: Si un mesero intenta abrir esto por consola, no lo dejamos
    if (!isAdmin) return; 

    setEditingId(promo.id);
    setStrategy(promo.is_automatic ? 'date' : 'coupon');
    setTarget(promo.category_id ? 'category' : 'product'); 
    setForm({
      code: promo.code,
      type: promo.type,
      value: promo.value,
      product_id: promo.product_id || '',
      category_id: promo.category_id || '',
      start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
      end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
      max_uses: promo.max_uses || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    Swal.fire({ title: t('promotions.sendToTrash'), icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: t('promotions.yesDelete') })
    .then((r) => { if(r.isConfirmed) deleteDiscount(id) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return; // Bloqueo de seguridad

    try {
      let finalValue = parseFloat(form.value) || 0;
      if (form.type === '2x1') finalValue = 0; 

      const finalProductId = (target === 'product' && form.product_id) ? form.product_id : null;
      const finalCategoryId = (target === 'category' && form.category_id) ? form.category_id : null;

      if (target === 'product' && !finalProductId) return Swal.fire(t('promotions.error'), t('promotions.mustSelectProduct'), 'error');
      if (target === 'category' && !finalCategoryId) return Swal.fire(t('promotions.error'), t('promotions.mustSelectCategory'), 'error');

      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: finalValue,
        product_id: finalProductId,   
        category_id: finalCategoryId, 
        start_date: form.start_date,
        end_date: form.end_date,
        is_automatic: strategy === 'date',
        max_uses: strategy === 'coupon' ? (parseInt(form.max_uses) || null) : null
      };
      
      if (payload.is_automatic && !payload.code) {
        payload.code = `AUTO-${target === 'category' ? 'CAT' : 'PROD'}-${new Date().getTime().toString().slice(-4)}`;
      }

      if (editingId) {
        await updateDiscount({ id: editingId, ...payload });
      } else {
        await createDiscount(payload);
      }
      setIsModalOpen(false);
    } catch (error) { 
      console.error(t('promotions.errorInSubmit'), error);
    }
  };

  if (isLoadingData) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <TicketPercent className="text-primary" /> 
                        {/* Si es mesero, siempre dice "Promociones Vigentes" porque no ve papelera */}
                        {isAdmin && viewMode === 'trash' ? t('promotions.trash') : t('promotions.currentPromotions')}
                    </h2>        
        <div className="flex gap-3">
             {/* SOLO ADMIN VE LA OPCIÓN DE CAMBIAR A PAPELERA */}
                 {isAdmin && (
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'active' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('promotions.active')}</button>
                        <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${viewMode === 'trash' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}><Archive size={16} /> {t('promotions.trash')}</button>
                    </div>
                 )}

            {/* SOLO ADMIN VE EL BOTÓN DE NUEVA PROMO */}
            {viewMode === 'active' && isAdmin && (
                <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                    <Plus size={18} /> <span className="hidden sm:inline">{t('promotions.newPromo')}</span>
                </button>
            )}
        </div>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDiscounts.map((promo) => (
          <div key={promo.id} className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-all">
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${promo.is_automatic ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                        {promo.is_automatic ? <><Zap size={12}/> {t('promotions.auto')}</> : <><Lock size={12}/> {t('promotions.coupon')}</>}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {promo.category_id ? <Layers size={12}/> : <Utensils size={12}/>}
                        {promo.category_id ? t('promotions.category') : t('promotions.product')}
                    </span>
                </div>
                <div className="mb-4">
                    <span className="text-xs font-mono text-gray-400 block mb-1">{promo.code}</span>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white">
                        {promo.type === '2x1' ? '2x1' : promo.type === 'percentage' ? `${promo.value}% OFF` : `$${promo.value} OFF`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('promotions.appliesTo')}: <span className="font-semibold text-primary">
                            {promo.category ? promo.category.name : promo.product ? promo.product.name : t('promotions.unknown')}
                        </span>
                    </p>
                </div>
                
                {/* FECHAS */}
                <div className="flex justify-between items-end border-t border-gray-100 dark:border-gray-700 pt-4">
                     <div className="space-y-1 text-xs text-gray-500">
                        <div>{promo.start_date?.split('T')[0]} ➜ {promo.end_date?.split('T')[0]}</div>
                     </div>
                     
                     {/* ACCIONES (SOLO ADMIN) - EL MESERO NO VE NADA AQUÍ */}
                     {isAdmin && (
                        <div className="flex gap-2">
                            {viewMode === 'active' ? (
                                <>
                                    <button onClick={() => handleOpenEdit(promo)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={16}/></button>
                                    <button onClick={() => handleDelete(promo.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </>
                            ) : (
                                <button onClick={() => restoreDiscount(promo.id)} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100"><RotateCcw size={14}/> {t('promotions.restore')}</button>
                            )}
                        </div>
                     )}
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* MODAL (Solo se renderiza si es Admin, aunque el botón de abrir ya está oculto) */}
                {isAdmin && (
                  <Modal isOpen={isModalOpen} onClose={() => !isCreating && setIsModalOpen(false)} title={editingId ? t('promotions.editPromotion') : t('promotions.newGameRule')}>            {/* ... CONTENIDO DEL MODAL IGUAL QUE ANTES ... */}
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* ... (Todo tu formulario aquí, sin cambios) ... */}
                {/* Solo copia el contenido del form anterior aquí */}
                                      <div className="grid grid-cols-2 gap-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                                         <button type="button" onClick={() => setStrategy('date')} disabled={isCreating} className={`py-2 rounded-lg text-sm font-bold transition-all ${strategy === 'date' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>
                                             <Zap size={16} className="inline mr-2"/> {t('promotions.automatic')}
                                         </button>
                                         <button type="button" onClick={() => setStrategy('coupon')} disabled={isCreating} className={`py-2 rounded-lg text-sm font-bold transition-all ${strategy === 'coupon' ? 'bg-white shadow text-amber-600' : 'text-gray-500'}`}>
                                             <Lock size={16} className="inline mr-2"/> {t('promotions.manualCoupon')}
                                         </button>
                                     </div>                {/* ... Resto de inputs ... */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                     {/* OBJETIVO */}
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{t('promotions.applyTo')}:</label>
                         <div className="flex gap-4 mb-3">
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="target" checked={target === 'category'} onChange={() => setTarget('category')} disabled={isCreating} className="text-primary focus:ring-primary"/>
                                 <span className="text-sm font-medium dark:text-gray-300">{t('promotions.category')}</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                                 <input type="radio" name="target" checked={target === 'product'} onChange={() => setTarget('product')} disabled={isCreating} className="text-primary focus:ring-primary"/>
                                 <span className="text-sm font-medium dark:text-gray-300">{t('promotions.product')}</span>
                             </label>
                         </div>
     
                         {target === 'category' ? (
                             <SearchableSelect label={t('promotions.selectCategory')} placeholder={t('promotions.search')} options={categories} value={form.category_id} onChange={(id) => setForm({...form, category_id: id})} />
                         ) : (
                             <SearchableSelect label={t('promotions.selectProduct')} placeholder={t('promotions.search')} options={products} value={form.product_id} onChange={(id) => setForm({...form, product_id: id})} />
                         )}
                     </div>
     
                     {/* TIPO Y VALOR */}
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('promotions.type')}</label>
                             <select className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.type} onChange={(e) => setForm({...form, type: e.target.value, value: e.target.value === '2x1' ? 0 : form.value})} disabled={isCreating}>
                                 <option value="2x1">2x1</option>
                                 <option value="percentage">{t('promotions.percentage')}</option>
                                 <option value="fixed">{t('promotions.fixed')}</option>
                             </select>
                         </div>
                         <div>
                             <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('promotions.value')}</label>
                             <input type="number" disabled={form.type === '2x1' || isCreating} placeholder={form.type === '2x1' ? '-' : '0'} className={`input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white ${form.type === '2x1' ? 'bg-gray-100 opacity-50' : ''}`} value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} />
                         </div>
                     </div>
     
                     <hr className="border-gray-200 dark:border-gray-700"/>
                     
                     {/* FECHAS O CÓDIGOS */}
                     {strategy === 'date' ? (
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">{t('promotions.start')}</label>
                                 <input type="date" disabled={isCreating} className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                             </div>
                             <div>
                                 <label className="text-xs font-bold text-gray-500 uppercase">{t('promotions.end')}</label>
                                 <input type="date" disabled={isCreating} className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                             </div>
                          </div>
                     ) : (
                         <div className="space-y-4">
                             <div>
                                 <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('promotions.code')}</label>
                                 <input type="text" disabled={isCreating} placeholder={t('promotions.codePlaceholder')} className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white uppercase font-mono tracking-widest" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 uppercase">{t('promotions.uses')}</label>
                                     <input type="number" disabled={isCreating} placeholder="100" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} />
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 uppercase">{t('promotions.expires')}</label>
                                     <input type="date" disabled={isCreating} className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                                 </div>
                             </div>
                         </div>
                     )}
               </div>
               <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setIsModalOpen(false)} disabled={isCreating} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 font-bold rounded-xl disabled:opacity-50">{t('promotions.cancel')}</button>
                 <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition disabled:opacity-70 flex justify-center items-center gap-2">
                     {isCreating ? <><Loader2 className="animate-spin" size={20} /> {t('promotions.saving')}</> : (editingId ? t('promotions.saveChanges') : t('promotions.createRule'))}
                 </button>
               </div>
            </form>
        </Modal>
      )}
    </div>
  );
};

export default Promotions;