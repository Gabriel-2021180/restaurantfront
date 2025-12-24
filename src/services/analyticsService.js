import api from '../api/axios';

export default {
  // 1. KPIs (Periodo: day | month)
  getKPIs: async (period = 'month') => {
    const { data } = await api.get(`/analytics/dashboard-kpi?period=${period}`);
    return data;
  },

  // 2. Rentabilidad
  getTopProfitable: async (limit = 5) => {
    const { data } = await api.get(`/analytics/top-profitable?limit=${limit}`);
    return data;
  },

  // 3. Comparativa Anual
  getYearComparison: async () => {
    const { data } = await api.get('/analytics/year-comparison');
    return data;
  },

  // 4. Patrón Semanal
  getWeeklyPattern: async () => {
    const { data } = await api.get('/analytics/weekly-pattern');
    return data;
  },

  // 5. Top Productos (Volumen)
  getTopProducts: async (month, year) => {
    const { data } = await api.get(`/analytics/top-products?month=${month}&year=${year}`);
    return data;
  },

  // 6. Horas Pico
  getPeakHours: async (month, year) => {
    const { data } = await api.get(`/analytics/peak-hours?month=${month}&year=${year}`);
    return data;
  },

  // 7. Personal
  getStaffPerformance: async (month, year) => {
    const { data } = await api.get(`/analytics/staff-performance?month=${month}&year=${year}`);
    return data;
  },
  
  // 8. Resumen Anual (Línea)
  getYearlyOverview: async (year) => {
    const { data } = await api.get(`/analytics/yearly-overview?year=${year}`);
    return data;
  }
};