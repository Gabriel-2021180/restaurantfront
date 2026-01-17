import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import categoryService from '../services/categoryService';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext'; 

export const useCategories = () => {
  const queryClient = useQueryClient();
  
  // 🔥 CORRECCIÓN: Usamos 'hasRole'
  const { hasRole } = useAuth(); 

  // Validación robusta
  const isAdmin = hasRole(['admin', 'super-admin']);

  // --- QUERIES ---
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getAll,
    staleTime: 1000 * 60 * 30,
    retry: false, // Evita bucle si falla
  });

  const trashQuery = useQuery({
    queryKey: ['categories-trash'],
    queryFn: categoryService.getTrash,
    staleTime: 1000 * 60 * 5,
    enabled: !!isAdmin, // 🔥 4. CLAVE: Si no es admin, NI SIQUIERA INTENTA cargar (Evita 403)
    retry: false,       // 🔥 5. CLAVE: Si el backend dice 403, NO insiste (Evita 429)
  });

  const refreshAll = () => {
    queryClient.invalidateQueries(['categories']);
    if (isAdmin) queryClient.invalidateQueries(['categories-trash']);
  };

  const handleError = (error) => {
    console.error("Error capturado:", error);
    let message = 'Ocurrió un error inesperado';

    if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
            if (Array.isArray(data.message)) {
                message = data.message.join('<br>'); 
            } else {
                message = data.message;
            }
        } else if (data.error) {
            message = data.error;
        }
    } else if (error.message) {
        message = error.message;
    }

    Swal.fire({
        title: 'Error',
        html: String(message),
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
    onError: handleError
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
    isLoading: categoriesQuery.isLoading, 
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    restoreCategory: restoreMutation.mutateAsync,
  };
};