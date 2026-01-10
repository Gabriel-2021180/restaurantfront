import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import analyticsService from '../services/analyticsService';

export const useAnalytics = () => {
  const now = new Date();
  
  // FILTROS GLOBALES
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // FILTROS ESPECÍFICOS
  const [kpiPeriod, setKpiPeriod] = useState('month'); // Para las tarjetas de arriba
  const [channelPeriod, setChannelPeriod] = useState('day'); // NUEVO: Para el VS (Mesas vs Pickup)

  // CONFIGURACIÓN (Cache de 5 min)
  const queryConfig = {
    staleTime: 1000 * 60 * 5, 
    retry: false,
    refetchOnWindowFocus: false 
  };

  // 1. KPIS
  const kpiQuery = useQuery({
    queryKey: ['kpis', kpiPeriod],
    queryFn: () => analyticsService.getKPIs(kpiPeriod),
    ...queryConfig
  });

  // 2. NUEVO: CANALES DE VENTA
  const channelsQuery = useQuery({
    queryKey: ['channels', channelPeriod],
    queryFn: () => analyticsService.getChannelStats(channelPeriod),
    ...queryConfig
  });

  // 3. COMPARATIVA AÑOS
  const comparisonQuery = useQuery({
    queryKey: ['year-comparison'],
    queryFn: analyticsService.getYearComparison,
    ...queryConfig
  });

  const profitableQuery = useQuery({
    queryKey: ['top-profitable'],
    queryFn: () => analyticsService.getTopProfitable(5),
    ...queryConfig
  });

  const weeklyQuery = useQuery({
    queryKey: ['weekly-pattern'],
    queryFn: analyticsService.getWeeklyPattern,
    ...queryConfig
  });

  const topProductsQuery = useQuery({
    queryKey: ['top-products', selectedMonth, selectedYear],
    queryFn: () => analyticsService.getTopProducts(selectedMonth, selectedYear),
    ...queryConfig
  });

  const peakHoursQuery = useQuery({
    queryKey: ['peak-hours', selectedMonth, selectedYear],
    queryFn: () => analyticsService.getPeakHours(selectedMonth, selectedYear),
    ...queryConfig
  });

  return {
    // Estados
    kpiPeriod, setKpiPeriod,
    channelPeriod, setChannelPeriod, // <--- Exportamos esto para el Dashboard
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,

    // Datos
    kpis: kpiQuery.data || {},
    channelsData: channelsQuery.data || null, // <--- Data nueva
    yearComparison: comparisonQuery.data || { data: [] },
    topProfitable: profitableQuery.data || [],
    weeklyPattern: weeklyQuery.data || [],
    topProducts: topProductsQuery.data || [],
    peakHours: peakHoursQuery.data || [],

    isLoading: kpiQuery.isLoading || channelsQuery.isLoading
  };
};