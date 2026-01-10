import api from '../api/axios';

export default {
  // A. ABRIR MESA
  openTable: async (tableId) => {
    const { data } = await api.post('/orders', { table_id: tableId });
    return data;
  },

  // B. AGREGAR ITEM
  addItem: async (orderId, { product_id, quantity, notes }) => {
    const { data } = await api.post(`/orders/${orderId}/items`, {
      product_id,
      quantity,
      notes
    });
    return data;
  },

  // C. VER COMANDA
  getOrder: async (orderId) => {
    const { data } = await api.get(`/orders/${orderId}`);
    return data;
  },

  // D. ELIMINAR ITEM
  removeItem: async (itemId) => {
    const { data } = await api.delete(`/orders/items/${itemId}`);
    return data;
  },

  // E. MARCHAR A COCINA
  sendToKitchen: async (orderId) => {
    const { data } = await api.post(`/orders/${orderId}/kitchen`, {});
    return data;
  },

  getKitchenHistory: async (orderId) => {
    const { data } = await api.get(`/orders/${orderId}/kitchen-history`);
    return data;
  },

  // F. CREAR PEDIDO PARA LLEVAR (POST)
  createPickupOrder: async (pickupData) => {
    const { data } = await api.post('/orders/pickup', pickupData);
    return data;
  },

  // --- G. PEDIDOS ACTIVOS (PARA LLEVAR) ---
  // CORRECCIÓN: Llamamos DIRECTO a tu ruta especial del backend
  getActivePickups: async () => {
    try {
        const { data } = await api.get('/orders/active-pickups'); 
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Error al obtener active-pickups:", e);
        return [];
    }
  },

  // --- H. PEDIDOS ACTIVOS (PARA COCINA) ---
  // CORRECCIÓN: Traemos las últimas 50 órdenes y filtramos manualmente en JS
  // para no depender de que el backend entienda "status=active"
  getActiveOrders: async () => {
    try {
        const { data } = await api.get('/orders'); // Trae las últimas 50
        if (!Array.isArray(data)) return [];

        // Filtro manual: Todo lo que NO esté cerrado ni cancelado ni facturado
        return data.filter(o => 
            ['pending', 'cooking', 'ready', 'in_process', 'pending_payment'].includes(o.status)
        );
    } catch (e) {
        return [];
    }
  }
};