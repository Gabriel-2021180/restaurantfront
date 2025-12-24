import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import inventoryService from '../services/inventoryService';
import Swal from 'sweetalert2';

export const useInventory = () => {
  const queryClient = useQueryClient();

  const suppliesQuery = useQuery({
    queryKey: ['supplies'],
    queryFn: inventoryService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: inventoryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['supplies']);
      Swal.fire('Creado', 'Insumo registrado correctamente', 'success');
    },
    onError: (err) => Swal.fire('Error', 'No se pudo crear el insumo', 'error')
  });

  const addStockMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryService.addStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['supplies']);
      Swal.fire('Stock Actualizado', 'Se agregó la compra al inventario', 'success');
    },
    onError: (err) => Swal.fire('Error', 'No se pudo agregar stock', 'error')
  });

  return {
    supplies: suppliesQuery.data || [],
    isLoading: suppliesQuery.isLoading,
    createSupply: createMutation.mutateAsync,
    addStock: addStockMutation.mutateAsync
  };
};