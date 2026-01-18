import { useState, useMemo, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '../../hooks/useProducts';
import { useInventory } from '../../hooks/useInventory';
import { useCategories } from '../../hooks/useCategories';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { SocketContext } from '../../context/SocketContext';
import { 
    Plus, Layers, Search, Pencil, Trash2, RotateCcw, Image as ImageIcon, 
    Upload, Loader2, ChefHat, Box, Archive, Gift, Package, CupSoda,
    TrendingUp, TrendingDown, DollarSign
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import productService from '../../services/productService';

const Products = () => {
  const { t } = useTranslation();
  
  const { products, trash, isLoading, createProduct, updateProduct, deleteProduct, restoreProduct } = useProducts();
  const { categories } = useCategories();
  const { supplies } = useInventory(); 
  const { hasRole } = useAuth();
  const { socket } = useContext(SocketContext);
  
  const isAdmin = hasRole(['super-admin', 'admin']);
  
  const [viewMode, setViewMode] = useState('active'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null); 
  const [previewUrl, setPreviewUrl] = useState(null);

  // ESTADOS DEL FORMULARIO
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  // 🔥 ESTADOS CLAVE
  const [isCombo, setIsCombo] = useState(false); 
  const [trackStock, setTrackStock] = useState(false); 

  const [stock, setStock] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [fixedCost, setFixedCost] = useState(''); 
  const [ingredients, setIngredients] = useState([]); 
  const [bundleItems, setBundleItems] = useState([]);

  const sourceData = viewMode === 'active' ? products : trash;

  const filteredList = useMemo(() => {
    return sourceData.filter(product => {
      const productName = product.name ? product.name.toLowerCase() : '';
      const search = searchTerm ? searchTerm.toLowerCase() : '';
      return productName.includes(search);
    });
  }, [sourceData, searchTerm]);

  const resetForm = () => {
    setName(''); setPrice(''); setDescription(''); setCategoryId('');
    setImageFile(null); setPreviewUrl(null); setEditingProduct(null);
    setIsCombo(false); setTrackStock(false);
    setStock(''); setPurchasePrice(''); setFixedCost(''); 
    setIngredients([]); setBundleItems([]); 
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (productSummary) => {
    resetForm();
    setEditingProduct(productSummary);
    setName(productSummary.name || ''); 
    setPrice(productSummary.price);
    setDescription(productSummary.description || '');
    setIsModalOpen(true);

    try {
        const fullProduct = await productService.getOne(productSummary.id);
        setCategoryId(fullProduct.category?.id || fullProduct.category_id || '');
        setPreviewUrl(fullProduct.image_url || null);
        
        // Asignación correcta de tipos
        const isComboBool = !!fullProduct.is_combo;
        const isTrackStockBool = !!fullProduct.track_stock;

        setIsCombo(isComboBool);
        // Si es combo, trackStock es irrelevante (false visualmente), si no, lo que venga de BD
        setTrackStock(isComboBool ? false : isTrackStockBool);

        if (isComboBool) {
            const items = fullProduct.bundleItems || fullProduct.bundle_items || [];
            setBundleItems(items.map(i => ({
                child_product_id: i.childProduct?.id || i.child_product_id,
                quantity: i.quantity
            })));
            setFixedCost(fullProduct.fixed_cost || ''); 
        } else if (isTrackStockBool) {
            setStock(fullProduct.stock || 0);
            setPurchasePrice(fullProduct.purchase_price || 0);
        } else {
            setFixedCost(fullProduct.fixed_cost || 0);
            const backendIngredients = fullProduct.recipeIngredients || fullProduct.ingredients || [];
            setIngredients(backendIngredients.map(i => ({
                supply_id: i.supply?.id || i.supply_id, 
                quantity: parseFloat(i.quantity) 
            })));
        }
    } catch (error) {
        console.error("Error cargando detalles", error);
    }
  };

  const addIngredientRow = () => setIngredients([...ingredients, { supply_id: '', quantity: '' }]);
  const removeIngredientRow = (index) => setIngredients(ingredients.filter((_, i) => i !== index));
  const updateIngredient = (index, field, value) => {
    const newIng = [...ingredients];
    newIng[index][field] = value;
    setIngredients(newIng);
  };

  const addBundleRow = () => setBundleItems([...bundleItems, { child_product_id: '', quantity: 1 }]);
  const removeBundleRow = (index) => setBundleItems(bundleItems.filter((_, i) => i !== index));
  const updateBundle = (index, field, value) => {
    const newB = [...bundleItems];
    newB[index][field] = value;
    setBundleItems(newB);
  };

  // 💰 CÁLCULO DE COSTOS Y RENTABILIDAD
  const totalCost = useMemo(() => {
      let total = 0;
      
      // 1. Costo de Ingredientes (Si es preparado)
      if (!isCombo && !trackStock) {
        ingredients.forEach(ing => {
            if (ing.supply_id && ing.quantity) {
                const supply = supplies.find(s => s.id === ing.supply_id);
                total += supply ? parseFloat(ing.quantity) * supply.cost_per_unit : 0;
            }
        });
        total += parseFloat(fixedCost) || 0;
      }

      // 2. Costo de Compra (Si es reventa)
      if (!isCombo && trackStock) {
          total = parseFloat(purchasePrice) || 0;
      }

      // 3. Costo de Combo (Suma de costos de hijos o precios base)
      if (isCombo) {
          bundleItems.forEach(item => {
              const prod = products.find(p => p.id === item.child_product_id);
              // Estimación: Costo del hijo o 60% de su precio venta si no hay dato
              if (prod) {
                 const childCost = parseFloat(prod.total_cost) || (prod.price * 0.6); 
                 total += childCost * (item.quantity || 0);
              }
          });
          total += parseFloat(fixedCost) || 0;
      }
      return total;
  }, [ingredients, fixedCost, supplies, bundleItems, products, isCombo, trackStock, purchasePrice]);

  // Cálculos finales para la UI
  const estimatedProfit = (parseFloat(price) || 0) - totalCost;
  const profitMargin = (parseFloat(price) || 0) > 0 ? (estimatedProfit / parseFloat(price)) * 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        const payload = new FormData();
        
        // Datos Básicos
        payload.append('name', name);
        payload.append('price', String(price));
        payload.append('description', description || '');
        if (imageFile) payload.append('file', imageFile);

        // 🔥🔥🔥 LÓGICA CRÍTICA BLINDADA 🔥🔥🔥
        // Si es false, NO LO ENVIAMOS. El backend lo tomará como undefined (falso).

        if (isCombo) {
            // --- CASO COMBO ---
            payload.append('is_combo', 'true'); // Solo enviamos si es true
            
            // Validar Bundle
            const cleanBundle = bundleItems
                .filter(i => i.child_product_id && i.quantity > 0)
                .map(i => ({ child_product_id: i.child_product_id, quantity: parseInt(i.quantity) }));
            if (cleanBundle.length === 0) throw new Error(t('products.comboMustHaveProducts'));
            
            payload.append('bundle_items', JSON.stringify(cleanBundle));
            payload.append('fixed_cost', String(fixedCost || 0));

        } else {
            // --- CASO PRODUCTO NORMAL (NO ENVIAMOS is_combo) ---
            
            if (!categoryId) throw new Error(t('products.mustSelectCategory'));
            payload.append('category_id', categoryId);

            if (trackStock) {
                // ES REVENTA (Kiosco)
                payload.append('track_stock', 'true'); // Solo enviamos si es true
                payload.append('stock', String(stock || 0));
                payload.append('purchase_price', String(purchasePrice || 0));
            } else {
                // ES PREPARADO (Cocina). NO ENVIAMOS track_stock.
                
                const cleanIngredients = ingredients
                    .filter(i => i.supply_id && i.quantity > 0)
                    .map(i => ({ supply_id: i.supply_id, quantity: parseFloat(i.quantity) }));
                
                payload.append('ingredients', JSON.stringify(cleanIngredients));
                payload.append('fixed_cost', String(fixedCost || 0));
            }
        }
        // 🔥🔥🔥 FIN DE LÓGICA BLINDADA 🔥🔥🔥

        if (editingProduct) {
            await updateProduct({ id: editingProduct.id, data: payload });
        } else {
            await createProduct(payload);
        }
      
        setIsModalOpen(false);
        resetForm(); 
        Swal.fire(t('products.success'), isCombo ? t('products.comboSaved') : t('products.productSaved'), 'success');
    } catch (error) {
        Swal.fire({ title: t('products.attention'), text: error.message, icon: 'warning' });
    } finally {
        setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleStockUpdate = () => productService.getAll();
    socket.on('notification', handleStockUpdate);
    return () => socket.off('notification', handleStockUpdate);
  }, [socket]);

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layers className="text-primary" />
            {viewMode === 'active' ? t('products.menuAndProducts') : t('products.trash')}
        </h2>
        
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
            {isAdmin && (
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'active' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>{t('products.active')}</button>
                    <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'trash' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}><Archive size={16} /> {t('products.trash')}</button>
                </div>
            )}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input type="text" placeholder={t('products.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white"/>
            </div>
            {viewMode === 'active' && isAdmin && (
                <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                    <Plus size={18} /> <span className="hidden sm:inline">{t('products.new')}</span>
                </button>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">{t('products.product')}</th>
                <th className="px-6 py-4">{t('products.category')}</th>
                <th className="px-6 py-4">{t('products.price')}</th>
                <th className="px-6 py-4">{t('products.type')}</th>
                {isAdmin && <th className="px-6 py-4 text-center">{t('products.actions')}</th>}
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
                                <p className="text-xs text-gray-500 line-clamp-1">{prod.description}</p>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {prod.category?.name || (prod.is_combo ? t('products.comboPromo') : t('products.noCategory'))}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">{prod.price} {t('common.currency')}</td>
                    <td className="px-6 py-4">
                        {prod.is_combo ? (
                            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded flex w-fit items-center gap-1"><Gift size={12}/> {t('products.combo')}</span>
                        ) : prod.track_stock ? (
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{t('products.resale')}</span>
                        ) : (
                            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">{t('products.prepared')}</span>
                        )}
                    </td>
                    {isAdmin && (
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                            {viewMode === 'active' ? (
                                <>
                                <button onClick={() => handleOpenEdit(prod)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                <button onClick={() => deleteProduct(prod.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </>
                            ) : (
                                <button onClick={() => restoreProduct(prod.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg flex items-center gap-1 font-bold text-xs"><RotateCcw size={16}/></button>
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

      {isAdmin && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? t('products.editProduct') : t('products.newProduct')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* SELECTOR PRINCIPAL: COMBO O NORMAL */}
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCombo ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'}`}>
                    <input 
                        type="checkbox" 
                        id="isComboCheck" 
                        checked={isCombo} 
                        onChange={e => { 
                            const val = e.target.checked;
                            setIsCombo(val); 
                            // IMPORTANTE: Si es combo, desactivamos reventa
                            if (val) setTrackStock(false); 
                        }} 
                        className={`w-5 h-5 text-purple-600 rounded cursor-pointer ${editingProduct ? 'opacity-50' : ''}`}
                        disabled={!!editingProduct}
                    />
                    <label htmlFor="isComboCheck" className="text-sm font-bold text-gray-800 dark:text-white flex-1 cursor-pointer">
                        {isCombo ? t('products.isComboPromotion') : t('products.isStandardProduct')}
                    </label>
                    {isCombo ? <Gift className="text-purple-500"/> : <Package className="text-gray-400"/>}
                </div>

                {/* DATOS BÁSICOS */}
                <div className="flex gap-4">
                    <div className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden group">
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <Upload className="text-gray-400"/>}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const f = e.target.files[0]; if(f){ setImageFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">{t('products.name')}</label>
                            <input type="text" required className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white" value={name} onChange={e=>setName(e.target.value)}/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">{t('products.price')}</label>
                                <input type="number" step="0.50" required className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white font-bold" value={price} onChange={e=>setPrice(e.target.value)}/>
                            </div>
                            {!isCombo && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('products.category')}</label>
                                    <SearchableSelect options={categories} value={categoryId} onChange={setCategoryId} placeholder={t('products.selectPlaceholder')} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('products.description')}</label>
                    <textarea rows="2" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800 dark:text-white resize-none" value={description} onChange={e=>setDescription(e.target.value)}></textarea>
                </div>

                {/* SELECTOR TIPO: COCINA vs REVENTA */}
                {!isCombo && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded-xl flex">
                        <button type="button" onClick={() => setTrackStock(false)} disabled={!!editingProduct} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!trackStock ? 'bg-white shadow text-orange-600 ring-1 ring-orange-100' : 'text-gray-400 hover:text-gray-600'}`}>
                            <ChefHat className="inline mr-2" size={14}/> {t('products.preparedKitchen')}
                        </button>
                        <button type="button" onClick={() => setTrackStock(true)} disabled={!!editingProduct} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${trackStock ? 'bg-white shadow text-blue-600 ring-1 ring-blue-100' : 'text-gray-400 hover:text-gray-600'}`}>
                            <CupSoda className="inline mr-2" size={14}/> {t('products.resaleKiosk')}
                        </button>
                    </div>
                )}

                {/* FORMULARIOS ESPECÍFICOS SEGÚN TIPO */}
                {isCombo ? (
                    // MODO COMBO
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 space-y-3">
                        <div className="flex items-center gap-2 text-purple-700 font-bold text-sm"><Package size={18} /> {t('products.packContent')}</div>
                        {bundleItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <div className="flex-1"><SearchableSelect options={products.filter(p => !p.is_combo)} value={item.child_product_id} onChange={(val) => updateBundle(index, 'child_product_id', val)} placeholder={t('products.productPlaceholder')}/></div>
                                <input type="number" className="w-20 p-2 border rounded-lg text-center font-bold dark:bg-gray-800" value={item.quantity} onChange={(e) => updateBundle(index, 'quantity', e.target.value)}/>
                                <button type="button" onClick={() => removeBundleRow(index)} className="text-red-400"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button type="button" onClick={addBundleRow} className="text-xs font-bold text-purple-600 flex items-center gap-1"><Plus size={14}/> {t('products.addProduct')}</button>
                    </div>
                ) : trackStock ? (
                    // MODO REVENTA
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm"><Box size={18} /> {t('products.stockControl')}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-500 uppercase">{t('products.initialStock')}</label><input type="number" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800" value={stock} onChange={e=>setStock(e.target.value)}/></div>
                            <div><label className="text-xs font-bold text-gray-500 uppercase">{t('products.purchaseCost')}</label><input type="number" step="0.50" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800" value={purchasePrice} onChange={e=>setPurchasePrice(e.target.value)}/></div>
                        </div>
                    </div>
                ) : (
                    // MODO PREPARADO (Receta)
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 space-y-3">
                        <div className="flex items-center gap-2 text-orange-700 font-bold text-sm"><ChefHat size={18} /> {t('products.recipeEscandallo')}</div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{t('products.extraFixedCost')}</label>
                        <input type="number" step="0.10" className="input-base w-full p-2 border rounded-xl dark:bg-gray-800" value={fixedCost} onChange={e=>setFixedCost(e.target.value)}/>
                        <div>
                            {ingredients.map((ing, index) => (
                                <div key={index} className="flex gap-2 mb-2 items-center">
                                    <div className="flex-1"><SearchableSelect options={supplies} value={ing.supply_id} onChange={(val) => updateIngredient(index, 'supply_id', val)} placeholder={t('products.supplyPlaceholder')} /></div>
                                    <input type="number" placeholder={t('products.kgShort')} className="w-20 p-2 border rounded-lg text-center dark:bg-gray-800" value={ing.quantity} onChange={(e) => updateIngredient(index, 'quantity', e.target.value)} />
                                    <button type="button" onClick={() => removeIngredientRow(index)} className="text-red-400"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-primary flex items-center gap-1"><Plus size={14}/> {t('products.addIngredient')}</button>
                        </div>
                    </div>
                )}

                {/* 💰 TARJETA DE RENTABILIDAD */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <DollarSign size={14}/> Análisis de Rentabilidad
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500">Costo Total</div>
                            <div className="font-bold text-red-500">{totalCost.toFixed(2)} Bs</div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500">Ganancia Neta</div>
                            <div className={`font-bold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {estimatedProfit.toFixed(2)} Bs
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-2 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-500">Margen</div>
                            <div className={`font-bold flex items-center justify-center gap-1 ${profitMargin >= 30 ? 'text-green-600' : profitMargin > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {profitMargin.toFixed(1)}% 
                                {profitMargin >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl dark:bg-gray-700 dark:text-white hover:bg-gray-200 transition">{t('products.cancel')}</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50">
                        {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : t('products.save')}
                    </button>
                </div>
            </form>
          </Modal>
      )}
    </div>
  );
};

export default Products;