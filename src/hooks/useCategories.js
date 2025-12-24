import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import categoryService from '../services/categoryService';
import Swal from 'sweetalert2';

export const useCategories = () => {
  const queryClient = useQueryClient();

  // --- QUERIES ---
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
    staleTime: 1000 * 60 * 30,
  });

  const trashQuery = useQuery({
    queryKey: ['categories-trash'],
    queryFn: categoryService.getTrash,
    staleTime: 1000 * 60 * 5,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries(['categories']);
    queryClient.invalidateQueries(['categories-trash']);
  };

  const handleError = (error) => {
    console.error("Error capturado:", error);
    
    let message = 'Ocurrió un error inesperado';

    if (error.response?.data) {
        const data = error.response.data;
        
        // NestJS suele devolver: { message: ["error 1", "error 2"], error: "Bad Request", ... }
        if (data.message) {
            // Si es un array (varios errores), los unimos con comas
            if (Array.isArray(data.message)) {
                message = data.message.join('<br>'); // Usamos <br> para saltos de línea en Swal
            } else {
                message = data.message;
            }
        } else if (data.error) {
            message = data.error;
        }
    } else if (error.message) {
        message = error.message;
    }

    // Forzamos que sea String para que Swal no explote
    Swal.fire({
        title: 'Error',
        html: String(message), // Usamos 'html' para que interprete el <br>
        icon: 'error'
    });
  };

  // --- MUTACIONES ---
  const createMutation = useMutation({
    mutationFn: categoryService.create,
    onSuccess: () => {
      refreshAll();
      Swal.fire('¡Creada!', 'Nueva sección añadida.', 'success');
    },
    onError: handleError // <--- Usamos el manejador blindado
  });

  const updateMutation = useMutation({
    mutationFn: categoryService.update,
    onSuccess: () => {
      refreshAll();
      Swal.fire('¡Actualizada!', 'Categoría modificada.', 'success');
    },
    onError: handleError
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => {
      refreshAll();
      Swal.fire('Eliminada', 'La categoría pasó a la papelera.', 'success');
    },
    onError: handleError
  });

  const restoreMutation = useMutation({
    mutationFn: categoryService.restore,
    onSuccess: () => {
      refreshAll();
      Swal.fire('Restaurada', 'Categoría activa de nuevo.', 'success');
    },
    onError: handleError
  });

  return {
    categories: categoriesQuery.data || [],
    trash: trashQuery.data || [],
    isLoading: categoriesQuery.isLoading || trashQuery.isLoading,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    restoreCategory: restoreMutation.mutateAsync,
  };
};