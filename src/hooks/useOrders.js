import { useState, useEffect } from 'react';
import api from '../api/axios'; 
import orderService from '../services/orderService'; 
import Swal from 'sweetalert2';

export const useOrders = (orderId = null) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ESTADO INTERNO DE CARGA (Para bloquear el botón de Cocina)
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      // No activamos isLoading global para evitar parpadeos
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- AGREGAR PRODUCTO (OPTIMISTA / INSTANTÁNEO) ---
  const addItem = async ({ product_id, quantity, notes }, productData) => {
    // 1. Guardamos backup
    const previousOrder = { ...order };

    // 2. Validación de seguridad (Evita el Error 400)
    const safeQty = parseInt(quantity) || 1; 
    const safeNotes = notes || '';

    // 3. Pintamos YA en pantalla
    const tempItem = {
        id: `temp-${Date.now()}`, 
        product: productData, 
        quantity: safeQty,
        price_at_purchase: productData.price,
        notes: safeNotes,
        isTemp: true 
    };

    setOrder(prev => ({
        ...prev,
        details: [...(prev.details || []), tempItem],
        total: (parseFloat(prev.total || 0) + (parseFloat(productData.price) * safeQty)).toString()
    }));

    try {
      setIsSyncing(true); // <--- ACTIVAMOS EL BLOQUEO
      
      // 4. Enviar al servidor
      await api.post(`/orders/${orderId}/items`, { 
          product_id, 
          quantity: safeQty, 
          notes: safeNotes 
      });
      
      // 5. Sincronizar IDs reales en silencio
      await fetchOrder(); 

    } catch (error) {
      console.error("Error al agregar:", error);
      setOrder(previousOrder); // Rollback visual
      Swal.fire({
          toast: true, position: 'top-end', icon: 'error',
          title: 'No se pudo agregar', text: 'Verifica tu conexión',
          timer: 2000
      });
    } finally {
      setIsSyncing(false); // <--- LIBERAMOS EL BLOQUEO
    }
  };

  const removeItem = async (itemId) => {
    const previousOrder = { ...order };
    setOrder(prev => ({
        ...prev,
        details: prev.details.filter(item => item.id !== itemId)
    }));

    try {
      setIsSyncing(true);
      await api.delete(`/orders/items/${itemId}`);
      fetchOrder(); 
    } catch (error) {
      setOrder(previousOrder);
      Swal.fire('Error', 'No se pudo eliminar', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const openTable = async (tableId) => {
      const { data } = await api.post('/orders', { table_id: tableId });
      return data;
  };

  const sendToCashier = async (id) => {
      await api.patch(`/orders/${id}/close`);
      return true;
  };

  const sendToKitchen = async (specificOrderId = null) => {
    const idToUse = specificOrderId || orderId; 
    if (!idToUse) return null; 
    try {
      const ticketData = await orderService.sendToKitchen(idToUse);
      return ticketData;
    } catch (error) { return null; }
  };

  return {
    order,
    isLoading,
    isSyncing, // Exportamos esto para que el botón de cocina sepa cuando bloquearse
    addItem,
    removeItem,
    openTable,
    sendToCashier, 
    sendToKitchen 
  };
};