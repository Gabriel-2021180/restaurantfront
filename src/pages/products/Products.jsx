import { useState, useMemo } from 'react'; // Agregamos useMemo
import { useProducts } from '../../hooks/useProducts';
import { useInventory } from '../../hooks/useInventory';
import { useCategories } from '../../hooks/useCategories';
import Modal from '../../components/ui/Modal';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { Plus, Search, Pencil, Trash2, RotateCcw, Image as ImageIcon, Upload, Loader2, ChefHat, Box, Info, Calculator, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

const Products = () => {
  const { products, trash, isLoading, createProduct, updateProduct, deleteProduct, restoreProduct } = useProducts();
  const { categories } = useCategories();
  const { supplies } = useInventory(); 

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
  
  const [trackStock, setTrackStock] = useState(false); 
  const [stock, setStock] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [fixedCost, setFixedCost] = useState(''); 
  const [ingredients, setIngredients] = useState([]); 

  const sourceData = viewMode === 'active' ? products : trash;

  const filteredProducts = sourceData.filter(p => {
      const productName = p.name ? p.name.toLowerCase() : '';
      const search = searchTerm ? searchTerm.toLowerCase() : '';
      return productName.includes(search);
  });

  const resetForm = () => {
    setName(''); setPrice(''); setDescription(''); setCategoryId('');
    setImageFile(null); setPreviewUrl(null); setEditingProduct(null);
    setTrackStock(false);
    setStock(''); setPurchasePrice('');
    setFixedCost(''); setIngredients([]);
  };

  const handleOpenCreate = () => { resetForm(); setIsModalOpen(true); };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setName(product.name || ''); 
    setPrice(product.price);
    setDescription(product.description || '');
    
    // 1. CORRECCIÓN CATEGORÍA
    // Tu JSON devuelve: "category": { "id": "..." }
    const catId = product.category?.id || product.category_id || '';
    setCategoryId(catId);

    setPreviewUrl(product.image_url || null);
    setImageFile(null);
    
    const isResale = !!product.track_stock;
    setTrackStock(isResale);

    if (isResale) {
        setStock(product.stock || 0);
        setPurchasePrice(product.purchase_price || 0);
        setFixedCost(''); 
        setIngredients([]);
    } else {
        setFixedCost(product.fixed_cost || 0);
        
        // 2. CORRECCIÓN INGREDIENTES (AQUÍ ESTABA EL ERROR)
        // Tu API devuelve 'recipeIngredients', no 'ingredients'.
        // Usamos || [] por si viene nulo.
        const backendIngredients = product.recipeIngredients || product.ingredients || [];
        
        setIngredients(backendIngredients.map(i => ({
            // Tu JSON tiene "supply": { "id": "..." }
            supply_id: i.supply?.id || i.supply_id, 
            
            // Tu JSON tiene "quantity": "150.0000" (string) -> Lo pasamos a número
            quantity: parseFloat(i.quantity) 
        })));
        
        setStock(''); 
        setPurchasePrice('');
    }
    
    setIsModalOpen(true);
  };

  // --- MANEJO DE INGREDIENTES ---
  const addIngredientRow = () => {
    setIngredients([...ingredients, { supply_id: '', quantity: '' }]);
  };

  const removeIngredientRow = (index) => {
    const newIng = [...ingredients];
    newIng.splice(index, 1);
    setIngredients(newIng);
  };

  const updateIngredient = (index, field, value) => {
    const newIng = [...ingredients];
    newIng[index][field] = value;
    setIngredients(newIng);
  };

  // --- CALCULADORA DE COSTOS (LA MAGIA) 🧙‍♂️ ---
  const getIngredientCostInfo = (ing) => {
      if (!ing.supply_id || !ing.quantity) return { total: 0, pricePerKg: 0 };
      
      const supply = supplies.find(s => s.id === ing.supply_id);
      if (!supply) return { total: 0, pricePerKg: 0 };

      // supply.cost_per_unit está en GRAMOS (según Supplies.jsx)
      const cost = parseFloat(ing.quantity) * supply.cost_per_unit;
      const pricePerKg = supply.cost_per_unit * 1000;

      return { total: cost, pricePerKg };
  };

  const totalRecipeCost = useMemo(() => {
      const ingCost = ingredients.reduce((acc, ing) => acc + getIngredientCostInfo(ing).total, 0);
      const fixed = parseFloat(fixedCost) || 0;
      return ingCost + fixed;
  }, [ingredients, fixedCost, supplies]);


  // --- ENVÍO DE DATOS (FIX VALIDACIÓN) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
        // 1. Limpiamos y preparamos los ingredientes
        const cleanIngredients = !trackStock ? ingredients
            .filter(i => i.supply_id && i.quantity > 0)
            .map(i => ({
                supply_id: i.supply_id,
                quantity: parseFloat(i.quantity) // Asegurar número
            })) : [];

        let payload;

        if (imageFile) {
            // --- MODO CON FOTO (FormData) ---
            payload = new FormData();
            payload.append('name', name);
            payload.append('price', price); // Se va como "50" (string)
            if (description) payload.append('description', description);
            if (categoryId) payload.append('category_id', categoryId);
            payload.append('file', imageFile);
            
            // Booleanos como String
            payload.append('track_stock', trackStock ? 'true' : 'false'); 

            if (trackStock) {
                payload.append('stock', stock || 0);
                payload.append('purchase_price', purchasePrice || 0);
            } else {
                payload.append('fixed_cost', fixedCost || 0);
                
                // --- AQUÍ ESTÁ EL TRUCO MAESTRO ---
                // Enviamos el array entero como UN solo string JSON.
                // El backend lo recibirá, lo convertirá de vuelta a Objeto y será feliz.
                payload.append('ingredients', JSON.stringify(cleanIngredients)); 
            }

        } else {
            // --- MODO SIN FOTO (JSON Puro) ---
            // Aquí no hay problema porque axios envía los tipos correctos
            payload = {
                name,
                price: parseFloat(price),
                description,
                category_id: categoryId,
                track_stock: trackStock,
                stock: trackStock ? (parseInt(stock) || 0) : 0,
                purchase_price: trackStock ? (parseFloat(purchasePrice) || 0) : 0,
                fixed_cost: trackStock ? 0 : (parseFloat(fixedCost) || 0),
                ingredients: trackStock ? [] : cleanIngredients
            };
        }

        if (editingProduct) {
            await updateProduct({ id: editingProduct.id, data: payload });
        } else {
            await createProduct(payload);
        }
      
        setIsModalOpen(false);
        resetForm(); 
        Swal.fire('Éxito', 'Producto guardado correctamente', 'success');

    } catch (error) {
        console.error("Error al guardar:", error);
        // El hook useProducts ya muestra la alerta con el error del backend
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

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          {viewMode === 'active' ? 'Carta del Menú' : 'Papelera'}
          <span className="text-sm font-normal px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">{filteredProducts.length}</span>
        </h2>
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <button onClick={() => setViewMode('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'active' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>Activos</button>
                <button onClick={() => setViewMode('trash')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === 'trash' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>Papelera</button>
            </div>
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl outline-none dark:text-white"/>
            </div>
            {viewMode === 'active' && (
                <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition active:scale-95">
                    <Plus size={18} /> <span className="hidden sm:inline">Nuevo Plato</span>
                </button>
            )}
        </div>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-bold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Precio Venta</th>
                <th className="px-6 py-4">Costo Receta</th>
                <th className="px-6 py-4">Ganancia</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredProducts.map((product) => {
                  const cost = parseFloat(product.total_cost || product.purchase_price || 0);
                  const profit = parseFloat(product.price) - cost;
                  const isProfitable = profit > 0;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center bg-cover bg-center" style={product.image_url ? {backgroundImage: `url(${product.image_url})`} : {}}>
                                {!product.image_url && <ImageIcon className="p-2 text-gray-400"/>}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-gray-200">{product.name || 'Sin Nombre'}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.track_stock ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {product.track_stock ? 'REVENTA' : 'RECETA'}
                                </span>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">$ {parseFloat(product.price).toFixed(2)}</td>
                        <td className="px-6 py-4 text-gray-500">$ {cost.toFixed(2)}</td>
                        <td className="px-6 py-4 font-bold">
                             <div className="flex flex-col">
                                <span className={`${isProfitable ? 'text-green-600' : 'text-red-500'}`}>
                                    $ {profit.toFixed(2)}
                                </span>
                             </div>
                        </td>
                        <td className="px-6 py-4">
                            {product.track_stock ? (
                                <span className={`font-bold ${product.stock < 5 ? 'text-red-500' : 'text-gray-600'}`}>{product.stock} un.</span>
                            ) : (
                                <span className="text-gray-400 text-xs">N/A</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                {viewMode === 'active' ? (
                                    <>
                                        <button onClick={() => handleOpenEdit(product)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={18} /></button>
                                        <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                    </>
                                ) : (
                                    <button onClick={() => handleRestore(product.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg"><RotateCcw size={16}/></button>
                                )}
                            </div>
                        </td>
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Producto" : "Nuevo Producto"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="grid grid-cols-2 gap-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
             <button type="button" onClick={() => setTrackStock(false)} className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${!trackStock ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>
                <ChefHat size={18}/> Es un Plato (Receta)
             </button>
             <button type="button" onClick={() => setTrackStock(true)} className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${trackStock ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>
                <Box size={18}/> Es Reventa (Coca)
             </button>
          </div>

          <div className="flex gap-4">
             <div className="w-24 h-24 bg-gray-50 border-2 border-dashed rounded-xl flex items-center justify-center relative cursor-pointer overflow-hidden group shrink-0">
                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover rounded-xl"/> : <Upload className="text-gray-400"/>}
             </div>
             <div className="flex-1 space-y-3">
                <input type="text" placeholder="Nombre del Producto" required className="w-full p-3 border rounded-xl" value={name} onChange={e=>setName(e.target.value)}/>
                <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="0.01" placeholder="Precio Venta ($)" required className="w-full p-3 border rounded-xl font-bold" value={price} onChange={e=>setPrice(e.target.value)}/>
                    <SearchableSelect 
                        placeholder="Categoría..." 
                        options={categories} 
                        value={categoryId} 
                        onChange={(id) => setCategoryId(id)}
                    />
                </div>
             </div>
          </div>

          <hr className="border-gray-100"/>

          {trackStock ? (
              // REVENTA
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                  <h4 className="text-blue-800 font-bold text-sm">Control de Inventario</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs font-bold text-blue-600">Stock Actual (Unidades)</label>
                          <input type="number" className="w-full p-2 border rounded-lg" value={stock} onChange={e=>setStock(e.target.value)}/>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-blue-600">Costo de Compra ($)</label>
                          <input type="number" step="0.01" className="w-full p-2 border rounded-lg" value={purchasePrice} onChange={e=>setPurchasePrice(e.target.value)}/>
                      </div>
                  </div>
              </div>
          ) : (
              // RECETA
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-4">
                  
                  {/* RESUMEN DE COSTOS */}
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-orange-200 shadow-sm">
                      <div className="flex items-center gap-3">
                          <Calculator className="text-orange-600 shrink-0" />
                          <div className="text-xs text-gray-600">
                              <p className="font-bold text-orange-800">COSTO RECETA: $ {totalRecipeCost.toFixed(2)}</p>
                              <p>El sistema usa los precios de tu inventario.</p>
                          </div>
                      </div>
                  </div>

                  <div className="flex justify-between items-center">
                      <h4 className="text-orange-800 font-bold text-sm">Ingredientes</h4>
                      <div className="w-1/3">
                          <label className="text-[10px] font-bold text-orange-600 uppercase">Costo Fijo (Gas/Pan)</label>
                          <input type="number" step="0.01" placeholder="0.00" className="w-full p-1.5 border rounded-lg text-sm" value={fixedCost} onChange={e=>setFixedCost(e.target.value)}/>
                      </div>
                  </div>

                  <div className="space-y-3">
                      {ingredients.map((ing, idx) => {
                          const { total, pricePerKg } = getIngredientCostInfo(ing);
                          
                          return (
                            <div key={idx} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableSelect 
                                        placeholder="Buscar Ingrediente..."
                                        options={supplies} 
                                        value={ing.supply_id}
                                        onChange={(val) => updateIngredient(idx, 'supply_id', val)}
                                    />
                                    {/* INFO DE COSTO DEBAJO DEL SELECT */}
                                    {total > 0 && (
                                        <p className="text-[10px] text-gray-500 mt-1 ml-1 flex gap-2">
                                            <span>Precio: ${pricePerKg.toFixed(2)}/kg</span>
                                            <span className="font-bold text-green-600">→ Gasto: ${total.toFixed(2)}</span>
                                        </p>
                                    )}
                                </div>
                                
                                <div className="relative w-24">
                                    <input 
                                        type="number" step="1" placeholder="Gramos" 
                                        className="w-full p-2 pr-8 border rounded-lg text-sm text-center font-bold h-[42px]" 
                                        value={ing.quantity} 
                                        onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                                    />
                                    <span className="absolute right-2 top-2.5 text-xs text-gray-400 font-bold">gr</span>
                                </div>

                                <button type="button" onClick={() => removeIngredientRow(idx)} className="p-2 mt-0.5 text-red-500 hover:bg-red-100 rounded h-[40px]"><Trash2 size={16}/></button>
                            </div>
                          );
                      })}
                      <button type="button" onClick={addIngredientRow} className="text-xs font-bold text-orange-600 flex items-center gap-1 hover:underline">
                          <Plus size={14}/> Agregar Ingrediente
                      </button>
                  </div>
              </div>
          )}

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin"/> : (editingProduct ? 'Guardar Cambios' : 'Crear Producto')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Products;