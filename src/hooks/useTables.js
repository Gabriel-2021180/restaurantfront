import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tableService from '../services/tableService';
import { useSocket } from '../context/SocketContext';
import Swal from 'sweetalert2';
// 👇 1. ESTA ES LA LÍNEA QUE TE FALTABA
import { useAuth } from '../context/AuthContext'; 

export const useTables = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  
  // 👇 2. AHORA SÍ PODEMOS USARLO
  const { hasRole } = useAuth(); 

  // 3. Verificar si es admin (solo ellos ven la papelera)
  const isAdmin = hasRole(['admin', 'super-admin']);

  // --- QUERIES ---
  const tablesQuery = useQuery({
    queryKey: ['tables'],
    queryFn: tableService.getAll,
  });

  const trashQuery = useQuery({
    queryKey: ['tables-trash'],
    queryFn: tableService.getTrash,
    staleTime: 1000 * 60 * 5,
    // 🔥 4. BLOQUEO: Esta consulta NO se ejecuta si eres mesero
    enabled: isAdmin, 
  });

  const refreshAll = () => {
    queryClient.invalidateQueries(['tables']);
    if (isAdmin) queryClient.invalidateQueries(['tables-trash']);
  };

  // --- ESCUCHAR SOCKET ---
  useEffect(() => {
    if (!socket) return;

    const handleTableChange = (data) => {
        const now = Date.now();
        // 🔥 Limita las actualizaciones a máximo 1 vez por segundo
        if (now - lastUpdate.current < 1000) return; 
        
        lastUpdate.current = now;
        console.log("🪑 CAMBIO MESA (Socket):", data);
        
        queryClient.invalidateQueries(['tables']);
        if (isAdmin) queryClient.invalidateQueries(['tables-trash']);
    };

    socket.on('table_status_changed', handleTableChange);

    return () => socket.off('table_status_changed', handleTableChange);
  }, [socket, queryClient, isAdmin]);

  // --- MUTACIONES ---
  const createMutation = useMutation({
    mutationFn: tableService.create,
    onSuccess: () => { refreshAll(); Swal.fire('Creada', 'Mesa lista.', 'success'); },
    onError: (error) => { console.error(error); Swal.fire('Error', 'No tienes permisos.', 'error'); }
  });

  const updateMutation = useMutation({
    mutationFn: tableService.update,
    onSuccess: () => { refreshAll(); Swal.fire('Actualizada', 'Cambios guardados.', 'success'); },
    onError: () => Swal.fire('Error', 'Falló la actualización', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: tableService.delete,
    onSuccess: () => { refreshAll(); Swal.fire('Eliminada', 'Mesa a papelera.', 'success'); },
    onError: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
  });

  const restoreMutation = useMutation({
    mutationFn: tableService.restore,
    onSuccess: () => { refreshAll(); Swal.fire('Restaurada', 'Mesa activa.', 'success'); },
    onError: () => Swal.fire('Error', 'No se pudo restaurar', 'error')
  });

  return {
    tables: tablesQuery.data || [],
    trash: trashQuery.data || [],
    isLoading: tablesQuery.isLoading,
    
    loadTables: tablesQuery.refetch, 

    isCreating: createMutation.isPending,
    createTable: createMutation.mutateAsync,
    updateTable: updateMutation.mutateAsync,
    deleteTable: deleteMutation.mutateAsync,
    restoreTable: restoreMutation.mutateAsync
  };
};