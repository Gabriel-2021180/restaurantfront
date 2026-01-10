import api from '../api/axios';

export default {
  // GET /menu/products
  getAll: async () => {
    const { data } = await api.get('/menu/products');
    return data;
  },
  
  getOne: async (id) => {
    const { data } = await api.get(`/menu/products/${id}`);
    return data;
  },

  // GET /menu/products/deleted
  getTrash: async () => {
    const { data } = await api.get('/menu/products/deleted');
    return data;
  },

  // POST /menu/products
  create: async (formData) => {
    const { data } = await api.post('/menu/products', formData);
    return data;
  },

  // PATCH /menu/products/:id
  update: async ({ id, formData }) => {
    const { data } = await api.patch(`/menu/products/${id}`, formData);
    return data;
  },

  // PATCH /menu/products/:id/toggle
  toggleActive: async (id) => {
    const { data } = await api.patch(`/menu/products/${id}/toggle`);
    return data;
  },

  // DELETE /menu/products/:id
  delete: async (id) => {
    const { data } = await api.delete(`/menu/products/${id}`);
    return data;
  },

  // PATCH /menu/products/:id/restore
  restore: async (id) => {
    const { data } = await api.patch(`/menu/products/${id}/restore`);
    return data;
  }
};