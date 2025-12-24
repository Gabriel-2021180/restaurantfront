import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import analyticsService from '../services/analyticsService';

export const useAnalytics = () => {
  const now = new Date();
  const [kpiPeriod, setKpiPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // CONFIGURACIÓN ANTI-SPAM (Evita error 429)
  const queryConfig = {
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
    retry: false, // No reintentar si falla
    refetchOnWindowFocus: false // No recargar al cambiar de pestaña
  };

  const kpiQuery = useQuery({
    queryKey: ['kpis', kpiPeriod],
    queryFn: () => analyticsService.getKPIs(kpiPeriod),
    ...queryConfig
  });

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

  const staffQuery = useQuery({
    queryKey: ['staff-performance', selectedMonth, selectedYear],
    queryFn: () => analyticsService.getStaffPerformance(selectedMonth, selectedYear),
    ...queryConfig
  });

  return {
    kpiPeriod, setKpiPeriod,
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,

    kpis: kpiQuery.data || {},
    yearComparison: comparisonQuery.data || { data: [] },
    topProfitable: profitableQuery.data || [],
    weeklyPattern: weeklyQuery.data || [],
    topProducts: topProductsQuery.data || [],
    peakHours: peakHoursQuery.data || [],
    staffPerformance: staffQuery.data || [],

    isLoading: kpiQuery.isLoading || comparisonQuery.isLoading || topProductsQuery.isLoading
  };
};