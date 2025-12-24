import api from '../api/axios';

export default {
  // GET /inventory/supplies
  getAll: async () => {
    const { data } = await api.get('/inventory/supplies');
    return data;
  },

  // POST /inventory/supplies
  create: async (data) => {
    const response = await api.post('/inventory/supplies', data);
    return response.data;
  },

  // POST /inventory/supplies/:id/stock
  addStock: async (id, { quantity, new_cost }) => {
    const response = await api.post(`/inventory/supplies/${id}/stock`, { quantity, new_cost });
    return response.data;
  },

  // PATCH /inventory/supplies/:id (Editar nombre, stock manual, etc.)
  update: async (id, data) => {
    const response = await api.patch(`/inventory/supplies/${id}`, data);
    return response.data;
  },

  // DELETE /inventory/supplies/:id
  delete: async (id) => {
    const response = await api.delete(`/inventory/supplies/${id}`);
    return response.data;
  }
};