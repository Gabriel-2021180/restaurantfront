import { useState, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useInventory } from '../../hooks/useInventory';
import { useCategories } from '../../hooks/useCategories';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { 
    Plus, Layers, Search, Pencil, Trash2, RotateCcw, Image as ImageIcon, 
    Upload, Loader2, ChefHat, Box, Archive, Gift, Package, AlertCircle 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import productService from '../../services/productService';
const Products = () => {
  const { products, trash, isLoading, createProduct, updateProduct, deleteProduct, restoreProduct } = useProducts();
  const { categories } = useCategories();
  const { supplies } = useInventory(); 
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['super-admin', 'admin']);
  
  const [viewMode, setViewMode] = useState('active'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);

  // FORMULARIO
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  // MODOS
  const [isCombo, setIsCombo] = useState(false); 
  const [trackStock, setTrackStock] = useState(false); 
  
  // DATOS
  const [stock, setStock] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [fixedCost, setFixedCost] = useState(''); 
  const [ingredients, setIngredients] = useState([]); 
  const [bundleItems, setBundleItems] = useState([]);

  const sourceData = viewMode === 'active' ? products : trash;

  const filteredList = sourceData.filter(product => {
      const productName = product.name ? product.name.toLowerCase() : '';
      const search = searchTerm ? searchTerm.toLowerCase() : '';
      return productName.includes(search);
  });

  const resetForm = () => {
    setName(''); setPrice(''); setDescription(''); setCategoryId('');
    setImageFile(null); setPreviewUrl(null); setEditingProduct(null);
    setIsCombo(false); setTrackStock(false);
    setStock(''); setPurchasePrice(''); setFixedCost(''); 
    setIngredients([]); setBundleItems([]); 
  };

  const handleOpenCreate = () => { resetForm(); setIsModalOpen(true); };

  const handleOpenEdit = async (productSummary) => {
    setEditingProduct(productSummary);
    setName(productSummary.name || ''); 
    setPrice(productSummary.price);
    setDescription(productSummary.description || '');
    
    // Reseteamos visualmente mientras carga lo real
    setBundleItems([]);
    setIngredients([]);
    setFixedCost('');
    setIsModalOpen(true);

    try {
        // Pedimos la data fresca al backend (incluye mermas y detalles)
        const fullProduct = await productService.getOne(productSummary.id);
        
        const catId = fullProduct.category?.id || fullProduct.category_id || '';
        setCategoryId(catId);
        setPreviewUrl(fullProduct.image_url || null);
        setImageFile(null);
        
        const comboStatus = !!fullProduct.is_combo;
        setIsCombo(comboStatus);
        const resaleStatus = !!fullProduct.track_stock;
        setTrackStock(resaleStatus);

        if (comboStatus) {
            // Cargar Bundle
            const items = fullProduct.bundleItems || fullProduct.bundle_items || [];
            setBundleItems(items.map(i => ({
                child_product_id: i.childProduct?.id || i.child_product_id,
                quantity: i.quantity
            })));
            
            // Cargar Ingredientes
            const backendIngredients = fullProduct.recipeIngredients || fullProduct.ingredients || [];
            setIngredients(backendIngredients.map(i => ({
                supply_id: i.supply?.id || i.supply_id, 
                quantity: parseFloat(i.quantity) 
            })));

            // --- CORRECCIÓN AQUÍ: CARGAR MERMA DEL COMBO ---
            setFixedCost(fullProduct.fixed_cost || ''); 

        } else if (resaleStatus) {
            setStock(fullProduct.stock || 0);
            setPurchasePrice(fullProduct.purchase_price || 0);
            setFixedCost('');
        } else {
            setFixedCost(fullProduct.fixed_cost || 0);
            const backendIngredients = fullProduct.recipeIngredients || fullProduct.ingredients || [];
            setIngredients(backendIngredients.map(i => ({
                supply_id: i.supply?.id || i.supply_id, 
                quantity: parseFloat(i.quantity) 
            })));
            setStock(''); setPurchasePrice('');
        }
    } catch (error) {
        console.error("Error cargando detalles", error);
        Swal.fire('Error', 'No se pudieron cargar los detalles completos', 'error');
    }
  };

  // LOGICA LISTAS
  const addIngredientRow = () => setIngredients([...ingredients, { supply_id: '', quantity: '' }]);
  const removeIngredientRow = (index) => { const newIng = [...ingredients]; newIng.splice(index, 1); setIngredients(newIng); };
  const updateIngredient = (index, field, value) => { const newIng = [...ingredients]; newIng[index][field] = value; setIngredients(newIng); };

  const addBundleRow = () => setBundleItems([...bundleItems, { child_product_id: '', quantity: 1 }]);
  const removeBundleRow = (index) => { const newB = [...bundleItems]; newB.splice(index, 1); setBundleItems(newB); };
  const updateBundle = (index, field, value) => { const newB = [...bundleItems]; newB[index][field] = value; setBundleItems(newB); };

  const getIngredientCostInfo = (ing) => {
      if (!ing.supply_id || !ing.quantity) return { total: 0 };
      const supply = supplies.find(s => s.id === ing.supply_id);
      return { total: supply ? parseFloat(ing.quantity) * supply.cost_per_unit : 0 };
  };

  const totalCost = useMemo(() => {
      let total = 0;
      // 1. Sumar Ingredientes
      total += ingredients.reduce((acc, ing) => acc + getIngredientCostInfo(ing).total, 0);
      
      // 2. Sumar Costo Fijo / Merma (AHORA SIEMPRE, INCLUSO EN COMBOS)
      total += parseFloat(fixedCost) || 0;
      
      // 3. Sumar Bundle (Si es combo)
      if (isCombo) {
          bundleItems.forEach(item => {
              const prod = products.find(p => p.id === item.child_product_id);
              if (prod) {
                  // Usamos costo de compra si es reventa, o un estimado del precio si no
                  const itemCost = prod.track_stock ? prod.purchase_price : (prod.price * 0.6);
                  total += (itemCost || 0) * (item.quantity || 0);
              }
          });
      }
      return total;
  }, [ingredients, fixedCost, supplies, bundleItems, products, isCombo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        const cleanIngredients = ingredients
            .filter(i => i.supply_id && i.quantity > 0)
            .map(i => ({ supply_id: i.supply_id, quantity: parseFloat(i.quantity) }));

        const cleanBundle = bundleItems
            .filter(i => i.child_product_id && i.quantity > 0)
            .map(i => ({ child_product_id: i.child_product_id, quantity: parseInt(i.quantity) }));

        if (isCombo && cleanBundle.length === 0) throw new Error("El combo debe tener productos.");
        if (!isCombo && !categoryId) throw new Error("Debes seleccionar una categoría.");

        let payload;

        if (imageFile) {
            payload = new FormData();
            payload.append('name', name);
            payload.append('price', price);
            payload.append('description', description || '');
            payload.append('is_combo', isCombo ? 'true' : 'false');
            payload.append('track_stock', (isCombo ? false : trackStock) ? 'true' : 'false');
            payload.append('file', imageFile);

            if (isCombo) {
                payload.append('bundle_items', JSON.stringify(cleanBundle));
                
                // --- CORRECCIÓN AQUÍ: ENVIAR MERMA ---
                payload.append('fixed_cost', fixedCost || 0); 

                if (cleanIngredients.length > 0) payload.append('ingredients', JSON.stringify(cleanIngredients));
            } else {
                payload.append('category_id', categoryId);
                if (trackStock) {
                    payload.append('stock', stock || 0);
                    payload.append('purchase_price', purchasePrice || 0);
                } else {
                    payload.append('fixed_cost', fixedCost || 0);
                    payload.append('ingredients', JSON.stringify(cleanIngredients));
                }
            }
        } else {
            payload = {
                name,
                price: parseFloat(price),
                description,
                is_combo: isCombo,
                track_stock: isCombo ? false : trackStock,
            };

            if (isCombo) {
                payload.bundle_items = cleanBundle;
                payload.category_id = null;
                
                // --- CORRECCIÓN AQUÍ: ENVIAR MERMA ---
                payload.fixed_cost = parseFloat(fixedCost) || 0;

                if (cleanIngredients.length > 0) payload.ingredients = cleanIngredients;
            } else {
                payload.category_id = categoryId;
                if (trackStock) {
                    payload.stock = parseInt(stock) || 0;
                    payload.purchase_price = parseFloat(purchasePrice) || 0;
                } else {
                    payload.fixed_cost = parseFloat(fixedCost) || 0;
                    payload.ingredients = cleanIngredients;
                }
            }
        }

        if (editingProduct) {
            await updateProduct({ id: editingProduct.id, data: payload });
        } else {
            await createProduct(payload);
        }
      
        setIsModalOpen(false);
        resetForm(); 
        Swal.fire('Éxito', isCombo ? 'Combo guardado' : 'Producto guardado', 'success');

    } catch (error) {
        console.error("Error al guardar:", error);
        let msg = "Error desconocido";
        if (error.response?.data?.message) {
            const m = error.response.data.message;
            msg = Array.isArray(m) ? m.join('<br>') : m;
        } else if (error.message) {
            msg = error.message;
        }
        Swal.fire({ title: 'Atención', html: msg, icon: 'warning' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDelete = (id) => { Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' }).then((r) => { if (r.isConfirmed) deleteProduct(id); }); };
  const handleRestore = (id) => { Swal.fire({ title: '¿Restaurar?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sí' }).then((r) => { if (r.isConfirmed) restoreProduct(id); }); };

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  const getModalTitle = () => {
      if (!editingProduct) return "Crear Nuevo";
      return isCombo ? "🎁 Editar Combo" : "✏️ Editar Producto";
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layers className="text-primary" />
            {viewMode === 'active' ? 'Menú & Productos' : 'Papelera'}
        </h2>
        
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
            {isAdmin && (
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'active' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Activos</button>
                    <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'trash' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}><Archive size={16} /> Papelera</button>
                </div>
            )}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white"/>
            </div>
            {viewMode === 'active' && isAdmin && (
                <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                    <Plus size={18} /> <span className="hidden sm:inline">Nuevo</span>
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
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">Tipo</th>
                {isAdmin && <th className="px-6 py-4 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredList.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100"/>
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400"><ImageIcon size={20}/></div>
                            )}
                            <div>
                                <p className="font-bold text-gray-800 dark:text-gray-200">{prod.name}</p>
                                <p className="text-xs text-gray-500">{prod.description?.substring(0,30)}...</p>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {prod.category?.name || (prod.is_combo ? 'COMBO/PROMO' : 'Sin Categoría')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">{prod.price} Bs</td>
                    <td className="px-6 py-4">
                        {prod.is_combo ? (
                            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded flex w-fit items-center gap-1"><Gift size={12}/> Combo</span>
                        ) : prod.track_stock ? (
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Reventa</span>
                        ) : (
                            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">Preparado</span>
                        )}
                    </td>
                    {isAdmin && (
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                            {viewMode === 'active' ? (
                                <>
                                <button onClick={() => handleOpenEdit(prod)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                <button onClick={() => handleDelete(prod.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </>
                            ) : (
                                <button onClick={() => handleRestore(prod.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg"><RotateCcw size={16}/></button>
                            )}
                            </div>
                        </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isAdmin && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={getModalTitle()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* SWITCH TIPO COMBO (BLOQUEADO AL EDITAR) */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${isCombo ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'} transition-all`}>
                    <input 
                        type="checkbox" 
                        id="isComboCheck" 
                        checked={isCombo} 
                        onChange={e => { setIsCombo(e.target.checked); if (e.target.checked) setTrackStock(false); }} 
                        className={`w-5 h-5 text-purple-600 rounded cursor-pointer ${editingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!!editingProduct}
                    />
                    <label htmlFor="isComboCheck" className={`text-sm font-bold text-gray-800 dark:text-white flex-1 ${editingProduct ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        {isCombo ? '🎁 Es un Combo / Promoción' : '📦 Es un Producto Estándar'}
                    </label>
                    {isCombo ? <Gift className="text-purple-500"/> : <Package className="text-gray-400"/>}
                </div>

                {editingProduct && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                        <AlertCircle size={16}/>
                        <span>Para cambiar el tipo (Combo/Producto), debes crear uno nuevo.</span>
                    </div>
                )}

                <div className="flex gap-4">
                    <div className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden cursor-pointer hover:border-primary group">
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <Upload className="text-gray-400 group-hover:text-primary"/>}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                            <input type="text" required className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={name} onChange={e=>setName(e.target.value)} placeholder={isCombo ? "Ej: Promo Kilo" : "Ej: Coca Cola"}/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Precio (Bs)</label>
                                <input type="number" step="0.50" required className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white font-bold" value={price} onChange={e=>setPrice(e.target.value)}/>
                            </div>
                            {!isCombo && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                                    <SearchableSelect options={categories} value={categoryId} onChange={setCategoryId} placeholder="Seleccionar..." />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                    <textarea rows="2" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white resize-none" value={description} onChange={e=>setDescription(e.target.value)}></textarea>
                </div>

                {/* TABS TIPO DE PRODUCTO (BLOQUEADO AL EDITAR) */}
                {!isCombo && (
                    <>
                        <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded-xl flex mb-2">
                            <button 
                                type="button" 
                                onClick={() => setTrackStock(false)} 
                                disabled={!!editingProduct}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${!trackStock ? 'bg-white shadow text-orange-600' : 'text-gray-400'} ${editingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                👨‍🍳 Preparado (Cocina)
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setTrackStock(true)} 
                                disabled={!!editingProduct}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${trackStock ? 'bg-white shadow text-blue-600' : 'text-gray-400'} ${editingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                🥤 Reventa (Kiosko)
                            </button>
                        </div>
                        {editingProduct && (
                            <div className="text-xs text-gray-400 text-center mb-4 italic">
                                El tipo de gestión (Cocina/Stock) es permanente.
                            </div>
                        )}
                    </>
                )}

                {/* LOGICA DE CONTENIDO IGUAL... */}
                {isCombo ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800 space-y-3">
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-1"><Package size={18} /> <span className="font-bold text-sm">Contenido del Pack</span></div>
                            {bundleItems.map((item, index) => (
                                <div key={index} className="flex gap-2 mb-2 items-center">
                                    <div className="flex-1"><SearchableSelect options={products.filter(p => !p.is_combo)} value={item.child_product_id} onChange={(val) => updateBundle(index, 'child_product_id', val)} placeholder="Producto..."/></div>
                                    <input type="number" placeholder="Cant" className="w-20 p-2 border rounded-lg text-sm text-center font-bold dark:bg-gray-800 dark:text-white" value={item.quantity} onChange={(e) => updateBundle(index, 'quantity', e.target.value)}/>
                                    <button type="button" onClick={() => removeBundleRow(index)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={addBundleRow} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 mt-2"><Plus size={14}/> Agregar Producto</button>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800 space-y-3">
                            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-1"><ChefHat size={18} /> <span className="font-bold text-sm">Insumos de Cocina</span></div>
                            {ingredients.map((ing, index) => (
                                <div key={index} className="flex gap-2 mb-2 items-center">
                                    <div className="flex-1"><SearchableSelect options={supplies} value={ing.supply_id} onChange={(val) => updateIngredient(index, 'supply_id', val)} placeholder="Insumo..." /></div>
                                    <input type="number" placeholder="Kg" className="w-20 p-2 border rounded-lg text-sm text-center dark:bg-gray-800 dark:text-white" value={ing.quantity} onChange={(e) => updateIngredient(index, 'quantity', e.target.value)} />
                                    <button type="button" onClick={() => removeIngredientRow(index)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 mt-2"><Plus size={14}/> Agregar Insumo</button>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                Costo Fijo / Merma <span className="text-[10px] font-normal text-gray-400">(Empaques, aceite, gas...)</span>
                            </label>
                            <input 
                                type="number" 
                                step="0.10" 
                                className="input-base w-full p-2 mt-1 border rounded-lg dark:bg-gray-700 dark:text-white font-bold" 
                                value={fixedCost} 
                                onChange={e=>setFixedCost(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                ) : trackStock ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1"><Box size={18} /> <span className="font-bold text-sm">Control de Stock</span></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Stock Inicial</label><input type="number" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={stock} onChange={e=>setStock(e.target.value)}/></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">Costo Compra</label><input type="number" step="0.50" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={purchasePrice} onChange={e=>setPurchasePrice(e.target.value)}/></div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800 space-y-3">
                         <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 mb-1"><ChefHat size={18} /> <span className="font-bold text-sm">Escandallo (Receta)</span></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Costo Fijo Extra</label><input type="number" step="0.10" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={fixedCost} onChange={e=>setFixedCost(e.target.value)}/></div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ingredientes</label>
                            {ingredients.map((ing, index) => (
                                <div key={index} className="flex gap-2 mb-2 items-center">
                                    <div className="flex-1"><SearchableSelect options={supplies} value={ing.supply_id} onChange={(val) => updateIngredient(index, 'supply_id', val)} placeholder="Insumo..." /></div>
                                    <input type="number" placeholder="Kg" className="w-20 p-2 border rounded-lg text-sm text-center dark:bg-gray-800 dark:text-white" value={ing.quantity} onChange={(e) => updateIngredient(index, 'quantity', e.target.value)} />
                                    <button type="button" onClick={() => removeIngredientRow(index)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mt-2"><Plus size={14}/> Agregar Insumo</button>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-dashed border-gray-300 flex justify-between items-center text-sm">
                    <div className="text-gray-500"><p>Costo Estimado: <span className="font-bold">{totalCost.toFixed(2)} Bs</span></p></div>
                    <div className={`px-3 py-1 rounded-lg font-bold ${((price - totalCost) > 0) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Margen: {((price - totalCost)).toFixed(2)} Bs</div>
                </div>

                <div className="pt-2 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl dark:bg-gray-700 dark:text-white">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition">{isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : 'Guardar'}</button>
                </div>
            </form>
          </Modal>
      )}
    </div>
  );
};

export default Products;