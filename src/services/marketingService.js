import api from '../api/axios';

export default {
  getAllDiscounts: async () => {
    const { data } = await api.get('/marketing/discounts');
    return data;
  },

  createDiscount: async (discountData) => {
    const { data } = await api.post('/marketing/discounts', discountData);
    return data;
  },

  updateDiscount: async ({ id, ...payload }) => { // <--- Cambiamos 'data' por 'payload' aquí
    // Ahora enviamos 'payload' y recibimos 'data' de Axios sin conflictos
    const { data } = await api.patch(`/marketing/discounts/${id}`, payload);
    return data;
  },

  deleteDiscount: async (id) => {
    const { data } = await api.delete(`/marketing/discounts/${id}`);
    return data;
  },

  getTrash: async () => {
    const { data } = await api.get('/marketing/discounts/trash');
    return data;
  },

  restoreDiscount: async (id) => {
    const { data } = await api.patch(`/marketing/discounts/${id}/restore`);
    return data;
  }
};