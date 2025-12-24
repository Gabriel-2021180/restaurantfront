import api from '../api/axios';

export default {
  // 1. VER ACTIVAS
  getAll: async () => {
    const { data } = await api.get('/menu/categories');
    return data;
  },

  // 2. CREAR
  create: async (categoryData) => {
    const { data } = await api.post('/menu/categories', categoryData);
    return data;
  },

  // 3. EDITAR
  update: async ({ id, ...categoryData }) => {
    // categoryData aquí ya es el resto del objeto payload (name, description...)
    const { data } = await api.patch(`/menu/categories/${id}`, categoryData);
    return data;
  },

  // 4. ELIMINAR (Soft Delete)
  delete: async (id) => {
    const { data } = await api.delete(`/menu/categories/${id}`);
    return data;
  },

  // 5. VER PAPELERA
  getTrash: async () => {
    const { data } = await api.get('/menu/categories/deleted');
    return data;
  },

  // 6. RESTAURAR
  restore: async (id) => {
    const { data } = await api.patch(`/menu/categories/${id}/restore`);
    return data;
  }
};