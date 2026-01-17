import { useState, useEffect, useRef } from 'react';
import api from '../api/axios'; 
import orderService from '../services/orderService'; 
import Swal from 'sweetalert2';
import toast from 'react-hot-toast'; 
import { useQueryClient, useMutation } from '@tanstack/react-query'; // Importamos useMutation

export const useOrders = (orderId = null) => {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mantenemos isSyncing manual por compatibilidad, pero la lógica real la llevará la mutación
  const [isSyncing, setIsSyncing] = useState(false); 
  
  const queryClient = useQueryClient();
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

  // 🔥 AQUÍ ESTABA EL ERROR: Usamos useMutation correctamente 🔥
  const addItemMutation = useMutation({
    mutationFn: async ({ product_id, quantity, notes }) => {
        // Hacemos la petición
        const { data } = await api.post(`/orders/${orderId}/items`, { 
            product_id, quantity, notes 
        });
        return data;
    },
    onMutate: () => {
        setIsSyncing(true); // Activamos bloqueo visual
    },
    onSuccess: async (data) => {
        // Si hay advertencia de stock, mostramos toast pequeño
        if (data.warning) {
            toast(data.warning, {
                icon: '⚠️',
                style: { borderRadius: '10px', background: '#FFF4E5', color: '#663C00' },
                duration: 4000,
            });
        }
        // Recargamos datos en segundo plano
        await fetchOrder(); 
        queryClient.invalidateQueries(['products']);
    },
    onError: (error) => {
        const msg = error.response?.data?.message || 'No se pudo agregar';
        toast.error(msg);
    },
    onSettled: () => {
        if (isMounted.current) setIsSyncing(false); // Desactivamos bloqueo
    }
  });

  // Funciones auxiliares
  const removeItem = async (itemId) => {
    try {
      setIsSyncing(true);
      await api.delete(`/orders/items/${itemId}`);
      await fetchOrder();
      queryClient.invalidateQueries(['products']);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    } finally {
      if (isMounted.current) setIsSyncing(false);
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
    const result = await orderService.sendToKitchen(idToUse);
    await fetchOrder();
    return result;
  };

  return { 
      order, 
      isLoading, 
      // Unimos el estado manual o el de la mutación para saber si está cargando
      isSyncing: isSyncing || addItemMutation.isPending, 
      addItem: addItemMutation.mutate, // Exponemos la función de mutación
      removeItem, 
      openTable, 
      sendToCashier, 
      sendToKitchen 
  };
};