import api from '../api/axios';

export default {
  // 1. KPIs (Periodo: day | month)
  getKPIs: async (period = 'month', month, year) => {
    let query = `period=${period}`;
    if (month) query += `&month=${month}`;
    if (year) query += `&year=${year}`;
    
    const { data } = await api.get(`/analytics/dashboard-kpi?${query}`);
    return data;
  },

  // 🔥 CORREGIDO: Ahora acepta y envía month y year
  getChannelStats: async (period = 'day', month, year) => {
    let query = `period=${period}`;
    if (month) query += `&month=${month}`;
    if (year) query += `&year=${year}`;
    
    const { data } = await api.get(`/analytics/channels?${query}`);
    return data; 
  },

  getDayChannels: async () => {
    const { data } = await api.get('/analytics/day-channels');
    return data; 
  },

  // 2. Rentabilidad
  getTopProfitable: async (limit = 5) => {
    const { data } = await api.get(`/analytics/top-profitable?limit=${limit}`);
    return data;
  },

  // 3. Comparativa Anual
  getYearComparison: async (year) => {
    const { data } = await api.get(`/analytics/year-comparison?year=${year}`);
    return data;
  },

  // 4. Patrón Semanal
  getWeeklyPattern: async () => {
    const { data } = await api.get('/analytics/weekly-pattern');
    return data;
  },

  // 5. TOP Productos (Ya estaba bien, lo dejamos igual)
  getTopProducts: async (month, year, pagination = {limit: 5, page: 1}) => {
    const { data } = await api.get(`/analytics/top-products?month=${month}&year=${year}&limit=${pagination.limit}`);
    return data;
  },

  // 6. Horas Pico
  getPeakHours: async (month, year) => {
    const { data } = await api.get(`/analytics/peak-hours?month=${month}&year=${year}`);
    return data;
  },

  // 7. Desempeño Personal
  getStaffPerformance: async (month, year) => {
    const { data } = await api.get(`/analytics/staff-performance?month=${month}&year=${year}`);
    return data;
  },
  
  // 8. Resumen Anual
  getYearlyOverview: async (year) => {
    const { data } = await api.get(`/analytics/yearly-overview?year=${year}`);
    return data;
  },

  getAuditLog: async () => {
    const { data } = await api.get('/analytics/audit-log');
    return data; 
  },

  // 2. DASHBOARD VISUAL
  getDashboardVisual: async (period = 'month') => {
    const { data } = await api.get(`/analytics/dashboard-visual?period=${period}`);
    return data;
  },

  // 3. RENDIMIENTO GLOBAL
  getPerformanceGlobal: async (from, to) => {
    let query = '';
    if (from && to) query = `?from=${from}&to=${to}`;
    const { data } = await api.get(`/analytics/performance-global${query}`);
    return data;
  }
};