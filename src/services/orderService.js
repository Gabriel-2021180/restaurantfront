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

  // E. NUEVO: MARCHAR A COCINA (Este faltaba)
  sendToKitchen: async (orderId) => {
    const { data } = await api.post(`/orders/${orderId}/kitchen`, {});
    return data;
  },

  getKitchenHistory: async (orderId) => {
    // GET /orders/:id/kitchen-history
    const { data } = await api.get(`/orders/${orderId}/kitchen-history`);
    return data;
  }
};