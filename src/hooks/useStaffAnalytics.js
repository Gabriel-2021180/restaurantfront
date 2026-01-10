import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import analyticsService from '../services/analyticsService';

export const useStaffAnalytics = () => {
  const [visualPeriod, setVisualPeriod] = useState('month');

  // CONFIGURACIÓN COMÚN
  const queryConfig = {
    staleTime: 1000 * 60 * 2, 
    refetchOnWindowFocus: false,
    retry: false // Importante para evitar bucles si da 404
  };

  const auditQuery = useQuery({
    queryKey: ['audit-log'],
    queryFn: analyticsService.getAuditLog,
    ...queryConfig
  });

  const visualQuery = useQuery({
    queryKey: ['dashboard-visual', visualPeriod],
    queryFn: () => analyticsService.getDashboardVisual(visualPeriod),
    ...queryConfig
  });

  const perfQuery = useQuery({
    queryKey: ['performance-global'],
    queryFn: () => analyticsService.getPerformanceGlobal(),
    ...queryConfig
  });

  return {
    visualPeriod, setVisualPeriod,
    auditLog: auditQuery.data || [],
    // Inicializamos con estructura segura para evitar crash de Recharts
    visualData: visualQuery.data || { cards: {}, charts: { waiters: { labels:[], series:[] }, payments: { labels:[], series:[] } } },
    performance: perfQuery.data || { waiters: [], cashiers: [], admins: [] },
    isLoading: auditQuery.isLoading || visualQuery.isLoading || perfQuery.isLoading
  };
};