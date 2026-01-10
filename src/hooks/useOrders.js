import { useState, useEffect, useRef } from 'react';
import api from '../api/axios'; 
import orderService from '../services/orderService'; 
import Swal from 'sweetalert2';

export const useOrders = (orderId = null) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (orderId) fetchOrder();
    return () => { isMounted.current = false; };
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      if (isMounted.current) setOrder(response.data);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 403) {
         Swal.fire('Acceso Denegado', 'No tienes permiso para ver esta mesa.', 'error');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const addItem = async ({ product_id, quantity, notes }, productData) => {
    // 1. VALIDACIÓN PRECIO ESTRICTA (Si llega 0, intenta usar el del objeto producto)
    const safeQty = parseInt(quantity) || 1; 
    let safePrice = parseFloat(productData.price);
    
    // Si por alguna razón el precio es inválido, forzamos 0 pero avisamos en consola
    if (isNaN(safePrice)) safePrice = 0;

    // Generar ID temporal robusto
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tempItem = { 
        id: tempId, 
        product: productData, // Guardamos toda la info del producto para no perder nombre/precio
        product_name: productData.name, // Respaldo visual
        quantity: safeQty, 
        price_at_purchase: safePrice, 
        notes: notes || '', 
        isTemp: true 
    };

    // 2. UI OPTIMISTA: Agregamos inmediatamente
    setOrder(prev => {
        if (!prev) return prev;
        // Evitamos duplicados temporales por si acaso
        const exists = prev.details?.find(i => i.id === tempId);
        if (exists) return prev;

        const newDetails = [...(prev.details || []), tempItem];
        
        // Recalcular total localmente
        const currentTotal = parseFloat(prev.total) || 0;
        const addedAmount = safePrice * safeQty;
        const newTotal = (currentTotal + addedAmount).toFixed(2);
        
        return { ...prev, details: newDetails, total: newTotal };
    });

    try {
      setIsSyncing(true);
      
      // 3. ENVIAR AL BACKEND
      const { data: savedItem } = await api.post(`/orders/${orderId}/items`, { 
          product_id, 
          quantity: safeQty, 
          notes 
      });
      
      // 4. ACTUALIZACIÓN SILENCIOSA (ID Temporal -> ID Real)
      // AQUÍ ESTABA EL ERROR DE $0.00: Al reemplazar, nos aseguramos de mantener el precio y el producto
      if (isMounted.current) {
          setOrder(prev => {
              if (!prev) return prev;
              const newDetails = prev.details.map(item => {
                  if (item.id === tempId) {
                      return { 
                          ...savedItem, // Datos del server (ID real)
                          product: productData, // MANTENEMOS la info visual del producto
                          price_at_purchase: safePrice, // FORZAMOS el precio correcto
                          isTemp: false 
                      };
                  }
                  return item;
              });
              return { ...prev, details: newDetails };
          });
      }

    } catch (error) {
      console.error("Error agregando item:", error);
      // Rollback si falla
      if (isMounted.current) {
          setOrder(prev => {
              if(!prev) return null;
              const filtered = prev.details.filter(item => item.id !== tempId);
              // Restar del total lo que falló
              const currentTotal = parseFloat(prev.total) || 0;
              const failedAmount = safePrice * safeQty;
              return {
                  ...prev,
                  details: filtered,
                  total: (currentTotal - failedAmount).toFixed(2)
              };
          });
          
          Swal.fire({
              toast: true, position: 'top-end', icon: 'error', 
              title: 'Error de red', text: 'No se guardó el item', showConfirmButton: false, timer: 2000
          });
      }
    } finally {
      if (isMounted.current) setIsSyncing(false);
    }
  };

  const removeItem = async (itemId) => {
    const isTemp = String(itemId).toString().startsWith('temp-');
    const previousOrder = { ...order };

    setOrder(prev => {
        if(!prev) return null;
        const itemToRemove = prev.details?.find(i => i.id === itemId);
        if (!itemToRemove) return prev; 

        const filtered = prev.details.filter(item => item.id !== itemId);
        
        const itemPrice = parseFloat(itemToRemove.price_at_purchase) || 0;
        const itemQty = parseInt(itemToRemove.quantity) || 1;
        const deduct = itemPrice * itemQty;
        const newTotal = (parseFloat(prev.total || 0) - deduct).toFixed(2);

        return { ...prev, details: filtered, total: newTotal };
    });

    if (isTemp) return; 

    try {
      setIsSyncing(true);
      await api.delete(`/orders/items/${itemId}`);
    } catch (error) {
      if (isMounted.current) {
          setOrder(previousOrder); 
          Swal.fire({ toast: true, title: 'Error al eliminar', icon: 'error', timer: 2000 });
      }
    } finally {
      if (isMounted.current) setIsSyncing(false);
    }
  };
  
  const openTable = async (tableId) => {
      try {
        const { data } = await api.post('/orders', { table_id: tableId });
        return data;
      } catch (error) { throw error; }
  };

  const sendToCashier = async (id) => {
      await api.patch(`/orders/${id}/close`);
      return true;
  };

  const sendToKitchen = async (specificOrderId = null) => {
    const idToUse = specificOrderId || orderId; 
    if (order?.details?.some(d => d.isTemp)) {
        Swal.fire({toast: true, title: 'Guardando cambios...', icon: 'info', timer: 1000});
        return null;
    }
    try {
      return await orderService.sendToKitchen(idToUse);
    } catch (error) { return null; }
  };

  return { order, isLoading, isSyncing, addItem, removeItem, openTable, sendToCashier, sendToKitchen };
};