import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productService from '../services/productService';
import Swal from 'sweetalert2';

export const useProducts = () => {
  const queryClient = useQueryClient();

  // 1. OBTENER PRODUCTOS ACTIVOS
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
    retry: false, // <--- IMPORTANTE: Si falla, no insistas (evita el lag)
    refetchOnWindowFocus: false,
  });

  // 2. OBTENER PAPELERA (CORREGIDO)
  const trashQuery = useQuery({
    queryKey: ['products-trash'],
    queryFn: productService.getTrash,
    retry: false, // <--- IMPORTANTE: Si da 404, se detiene y no congela la PC
    refetchOnWindowFocus: false,
    // Opcional: Podrías habilitarlo solo si estás en la vista de papelera, 
    // pero con retry: false es suficiente para arreglar el lag.
  });

  const handleError = (error) => {
    console.error("Error en productos:", error);
    // Swal.fire(...) // Opcional: Comenta esto si es muy molesto
  };

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      Swal.fire('Creado', 'Producto agregado al menú', 'success');
    },
    onError: (error) => {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al crear producto';
      // Mostramos el error real del backend para que sepas qué falta
      Swal.fire('Error de Validación', Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productService.update({ id, formData: data }), // Ojo aquí con el nombre del param
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      Swal.fire('Actualizado', 'Producto modificado', 'success');
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Error al actualizar';
      Swal.fire('Error', Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    }
  });

  // ... (Delete y Restore siguen igual)
  const deleteMutation = useMutation({ mutationFn: productService.delete, onSuccess: () => { queryClient.invalidateQueries(['products']); queryClient.invalidateQueries(['products-trash']); Swal.fire('Borrado', 'Producto movido a papelera', 'success'); }, onError: handleError });
  const restoreMutation = useMutation({ mutationFn: productService.restore, onSuccess: () => { queryClient.invalidateQueries(['products']); queryClient.invalidateQueries(['products-trash']); Swal.fire('Restaurado', 'Producto activo de nuevo', 'success'); }, onError: handleError });

  return {
    products: productsQuery.data || [],
    trash: trashQuery.data || [], // Si falla, devuelve array vacío y no rompe nada
    isLoading: productsQuery.isLoading, // Ignoramos la carga de la basura para no bloquear
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    restoreProduct: restoreMutation.mutateAsync
  };
};