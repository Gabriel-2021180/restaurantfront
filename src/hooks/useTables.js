import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tableService from '../services/tableService';
import { useSocket } from '../context/SocketContext';
import Swal from 'sweetalert2';

export const useTables = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // --- QUERIES ---
  const tablesQuery = useQuery({
    queryKey: ['tables'],
    queryFn: tableService.getAll,
    // CAMBIO IMPORTANTE: Quitamos staleTime: Infinity
    // Dejamos el comportamiento por defecto (staleTime: 0)
    // Esto asegura que al montar el componente siempre traiga datos frescos
    // staleTime: Infinity, <--- COMENTADO/BORRADO
  });

  const trashQuery = useQuery({
    queryKey: ['tables-trash'],
    queryFn: tableService.getTrash,
    staleTime: 1000 * 60 * 5,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries(['tables']);
    queryClient.invalidateQueries(['tables-trash']);
  };

  // --- ESCUCHAR SOCKET ---
  useEffect(() => {
    if (!socket) return;

    socket.on('table_status_changed', (data) => {
        console.log("🪑 CAMBIO MESA:", data);
        queryClient.invalidateQueries(['tables']);
    });

    return () => socket.off('table_status_changed');
  }, [socket, queryClient]);

  // --- MANEJO DE ERRORES ---
  const handleError = (error) => {
    console.error("Error Mesas:", error);
  };

  // --- MUTACIONES (IGUALES) ---
  const createMutation = useMutation({
    mutationFn: tableService.create,
    onSuccess: () => { refreshAll(); Swal.fire('Creada', 'Mesa lista.', 'success'); },
    onError: handleError
  });

  const updateMutation = useMutation({
    mutationFn: tableService.update,
    onSuccess: () => { refreshAll(); Swal.fire('Actualizada', 'Cambios guardados.', 'success'); },
    onError: handleError
  });

  const deleteMutation = useMutation({
    mutationFn: tableService.delete,
    onSuccess: () => { refreshAll(); Swal.fire('Eliminada', 'Mesa a papelera.', 'success'); },
    onError: handleError
  });

  const restoreMutation = useMutation({
    mutationFn: tableService.restore,
    onSuccess: () => { refreshAll(); Swal.fire('Restaurada', 'Mesa activa.', 'success'); },
    onError: handleError
  });

  return {
    tables: tablesQuery.data || [],
    trash: trashQuery.data || [],
    isLoading: tablesQuery.isLoading,
    isCreating: createMutation.isPending,
    createTable: createMutation.mutateAsync,
    updateTable: updateMutation.mutateAsync,
    deleteTable: deleteMutation.mutateAsync,
    restoreTable: restoreMutation.mutateAsync
  };
};