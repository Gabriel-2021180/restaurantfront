import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import marketingService from '../services/marketingService';
import Swal from 'sweetalert2';

export const useMarketing = () => {
  const queryClient = useQueryClient();

  // --- QUERIES ---
  const discountsQuery = useQuery({
    queryKey: ['discounts'],
    queryFn: marketingService.getAllDiscounts,
    staleTime: 1000 * 60 * 5, 
  });

  const trashQuery = useQuery({
    queryKey: ['discounts-trash'],
    queryFn: marketingService.getTrash,
    staleTime: 1000 * 60 * 5,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries(['discounts']);
    queryClient.invalidateQueries(['discounts-trash']);
  };

const handleError = (error) => {
    console.error("Error Marketing:", error);
    let message = 'Error al procesar la solicitud';

    if (error.response?.data) {
        const data = error.response.data;
        // NestJS devuelve arrays de errores a veces
        if (Array.isArray(data.message)) {
            message = data.message.join('<br>'); 
        } else if (data.message) {
            message = data.message;
        } else if (data.error) {
            message = data.error;
        }
    } 
    
    Swal.fire({ title: 'Atención', html: message, icon: 'warning' });
  };

  const createMutation = useMutation({
    mutationFn: marketingService.createDiscount,
    onSuccess: () => {
      refreshAll();
      Swal.fire('¡Promo Creada!', 'La regla se aplicará según configuraste.', 'success');
    },
    onError: handleError
  });

  const updateMutation = useMutation({
    mutationFn: marketingService.updateDiscount,
    onSuccess: () => {
      refreshAll();
      Swal.fire('¡Editado!', 'La promoción ha sido actualizada.', 'success');
    },
    onError: handleError
  });

  const deleteMutation = useMutation({
    mutationFn: marketingService.deleteDiscount,
    onSuccess: () => {
      refreshAll();
      Swal.fire('Eliminada', 'La promoción está en la papelera.', 'success');
    },
    onError: handleError
  });

  // --- RESTAURAR CON LÓGICA ESPECIAL ---
  const restoreMutation = useMutation({
    mutationFn: marketingService.restoreDiscount,
    onSuccess: (data) => {
      refreshAll();
      
      // Lógica pedida: Si el backend devuelve un warning (ej: fecha vencida)
      if (data.warning) {
        Swal.fire({
            title: 'Restaurada con Aviso',
            text: data.warning, // "La promo ya venció, edite la fecha"
            icon: 'warning',
            confirmButtonText: 'Entendido, voy a editarla'
        });
      } else {
        Swal.fire('Restaurada', 'La promoción está activa de nuevo.', 'success');
      }
    },
    onError: handleError
  });

  return {
    discounts: discountsQuery.data || [],
    trash: trashQuery.data || [],
    isLoadingData: discountsQuery.isLoading,
    isLoading: discountsQuery.isLoading || trashQuery.isLoading,
    createDiscount: createMutation.mutateAsync,
    updateDiscount: updateMutation.mutateAsync,
    deleteDiscount: deleteMutation.mutateAsync,
    restoreDiscount: restoreMutation.mutateAsync
  };
};