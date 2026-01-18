import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productService from '../services/productService';
import Swal from 'sweetalert2';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext'; 
import { useEffect } from 'react';

export const useProducts = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { hasRole } = useAuth(); 

  const isAdmin = hasRole(['admin', 'super-admin']);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const trashQuery = useQuery({
    queryKey: ['products-trash'],
    queryFn: productService.getTrash,
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!isAdmin, 
  });

  useEffect(() => {
      if (!socket) return;
      const handleProductChange = (data) => {
          queryClient.invalidateQueries(['products']);
          if (isAdmin) queryClient.invalidateQueries(['products-trash']);
      };
      socket.on('product_status_changed', handleProductChange);
      return () => socket.off('product_status_changed', handleProductChange);
  }, [socket, queryClient, isAdmin]);

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al crear';
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productService.update({ id, formData: data }), 
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al actualizar';
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    }
  });

  const deleteMutation = useMutation({ 
      mutationFn: productService.delete, 
      onSuccess: () => { 
          queryClient.invalidateQueries(['products']); 
          if(isAdmin) queryClient.invalidateQueries(['products-trash']); 
          Swal.fire('Borrado', 'Producto movido a papelera.', 'success'); 
      }, 
      onError: (error) => {
          // Capturamos el error elegantemente
          const msg = error.response?.status === 403 
            ? 'No tienes permiso para eliminar productos (Backend).' 
            : (error.response?.data?.message || 'No se pudo eliminar');
          
          Swal.fire('Acceso Denegado', msg, 'error');
      } 
  });

  const restoreMutation = useMutation({ 
      mutationFn: productService.restore, 
      onSuccess: () => { 
          queryClient.invalidateQueries(['products']); 
          if(isAdmin) queryClient.invalidateQueries(['products-trash']); 
          Swal.fire('Restaurado', 'Producto activo.', 'success'); 
      }, 
      onError: (error) => Swal.fire('Error', 'No se pudo restaurar.', 'error') 
  });

  return {
    products: productsQuery.data || [],
    trash: trashQuery.data || [], 
    isLoading: productsQuery.isLoading, 
    
    createProduct: createMutation.mutateAsync, 
    updateProduct: updateMutation.mutateAsync, 
    deleteProduct: deleteMutation.mutate, 
    restoreProduct: restoreMutation.mutate 
  };
};