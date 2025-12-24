import api from '../api/axios';

export default {
  // 1. VER TODAS (Activas)
  getAll: async () => {
    const { data } = await api.get('/tables');
    return data;
  },

  // 2. CREAR
  create: async (tableData) => {
    const { data } = await api.post('/tables', tableData);
    return data;
  },

  // 3. EDITAR
  update: async ({ id, ...data }) => {
    const { data: response } = await api.patch(`/tables/${id}`, data);
    return response;
  },

  // 4. ELIMINAR (Protegido por backend si está ocupada)
  delete: async (id) => {
    const { data } = await api.delete(`/tables/${id}`);
    return data;
  },

  // 5. VER ELIMINADAS (Ojo a la ruta '/trashed')
  getTrash: async () => {
    const { data } = await api.get('/tables/trashed');
    return data;
  },

  // 6. RESTAURAR (Ojo al método POST)
  restore: async (id) => {
    const { data } = await api.post(`/tables/${id}/restore`);
    return data;
  }
};