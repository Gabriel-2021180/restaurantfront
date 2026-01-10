import api from '../api/axios';

export default {
  // 1. KPIs (Periodo: day | month)
  getKPIs: async (period = 'month') => {
    const { data } = await api.get(`/analytics/dashboard-kpi?period=${period}`);
    return data;
  },
  getChannelStats: async (period = 'day') => {
    const { data } = await api.get(`/analytics/channels?period=${period}`);
    return data; 
    // Retorna: { dine_in: {...}, pickup: {...}, winner: 'Mesas' }
  },

  getDayChannels: async () => {
    const { data } = await api.get('/analytics/day-channels');
    return data; // { dine_in: {...}, pickup: {...}, winner: '...' }
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
  },

  getAuditLog: async () => {
    const { data } = await api.get('/analytics/audit-log');
    return data; 
  },

  // 2. DASHBOARD VISUAL (Cards + Charts)
  getDashboardVisual: async (period = 'month') => {
    const { data } = await api.get(`/analytics/dashboard-visual?period=${period}`);
    return data;
  },

  // 3. RENDIMIENTO GLOBAL (Tablas Personal)
  getPerformanceGlobal: async (from, to) => {
    // Si no hay fechas, el backend usará las por defecto
    let query = '';
    if (from && to) query = `?from=${from}&to=${to}`;
    
    const { data } = await api.get(`/analytics/performance-global${query}`);
    return data;
  },

  getAuditLog: async () => {
    const { data } = await api.get('/analytics/audit-log');
    return data; 
  },
  getDashboardVisual: async (period = 'month') => {
    const { data } = await api.get(`/analytics/dashboard-visual?period=${period}`);
    return data;
  },
  getPerformanceGlobal: async (from, to) => {
    let query = '';
    if (from && to) query = `?from=${from}&to=${to}`;
    const { data } = await api.get(`/analytics/performance-global${query}`);
    return data;
  }
  
};