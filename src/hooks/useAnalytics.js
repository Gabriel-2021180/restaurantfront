import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import analyticsService from '../services/analyticsService';

export const useAnalytics = () => {
  const now = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [kpiPeriod, setKpiPeriod] = useState('month'); 
  const [channelPeriod, setChannelPeriod] = useState('day'); 

  const queryConfig = {
    staleTime: 1000 * 60 * 5, 
    retry: false,
    refetchOnWindowFocus: false 
  };

  // 1. KPI Query (Sin cambios)
  const kpiQuery = useQuery({
    // 🔥 CLAVE: Agregamos selectedMonth y selectedYear a la "key".
    // Esto hace que si cambian, la query se dispara sola.
    queryKey: ['kpis', kpiPeriod, selectedMonth, selectedYear],
    
    queryFn: () => {
        const sendSpecificDate = kpiPeriod === 'month' || kpiPeriod === 'year';
        return analyticsService.getKPIs(
            kpiPeriod, 
            sendSpecificDate ? selectedMonth : undefined, 
            sendSpecificDate ? selectedYear : undefined
        );
    },
    ...queryConfig
  });

  // 🔥 2. CORRECCIÓN IMPORTANTE AQUÍ 🔥
  // Si el usuario elige "Hoy" o "Semana", NO enviamos mes/año para que el backend use la fecha real actual.
  const channelsQuery = useQuery({
    queryKey: ['channels', channelPeriod, selectedMonth, selectedYear],
    queryFn: () => {
        // Solo enviamos mes y año si el periodo es 'month' o 'year'
        const isHistory = channelPeriod === 'month' || channelPeriod === 'year';
        const m = isHistory ? selectedMonth : undefined;
        const y = isHistory ? selectedYear : undefined;
        
        return analyticsService.getChannelStats(channelPeriod, m, y);
    },
    ...queryConfig
  });

  // ... (El resto del archivo yearComparison, topProfitable, etc. déjalo igual)
  const comparisonQuery = useQuery({
    queryKey: ['year-comparison', selectedYear],
    queryFn: () => analyticsService.getYearComparison(selectedYear),
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
    kpiPeriod, setKpiPeriod,
    channelPeriod, setChannelPeriod,
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,

    kpis: kpiQuery.data || {},
    channelsData: channelsQuery.data || null, 
    yearComparison: comparisonQuery.data || { data: [] },
    topProfitable: profitableQuery.data || [],
    weeklyPattern: weeklyQuery.data || [],
    topProducts: topProductsQuery.data || [],
    peakHours: peakHoursQuery.data || [],
    
    isLoading: kpiQuery.isLoading
  };
};