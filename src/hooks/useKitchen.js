import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import orderService from '../services/orderService';
import { useSocket } from '../context/SocketContext'; // Usamos el socket real
import Swal from 'sweetalert2';

export const useKitchen = (orderId = null) => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // 1. OBTENER DATOS (Solo fetch inicial, sin polling)
  const historyQuery = useQuery({
    queryKey: ['kitchenHistory', orderId],
    queryFn: () => orderService.getKitchenHistory(orderId),
    enabled: !!orderId,
    // refetchInterval: 2500, <--- ¡BORRADO! Ya no hace falta
  });

  // 2. ESCUCHAR EL SOCKET REAL
  useEffect(() => {
    if (!socket) return;

    // Nombre exacto de tu backend: notifyKitchenNewOrder -> emit('kitchen_new_order')
    socket.on('kitchen_new_order', (data) => {
        console.log("🔔 ALERTA COCINA:", data);
        
        // Recargamos los datos inmediatamente para que aparezca la comanda
        queryClient.invalidateQueries(['kitchenHistory']);
        
        // Opcional: Podrías poner un sonido aquí
    });

    return () => {
        socket.off('kitchen_new_order');
    };
  }, [socket, queryClient]);

  // 3. ENVIAR A COCINA
  const sendMutation = useMutation({
    mutationFn: (id) => orderService.sendToKitchen(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kitchenHistory']);
      Swal.fire({
        title: '¡Oído Cocina!',
        text: 'La comanda ha sido marcada.',
        icon: 'success',
        timer: 1000,
        showConfirmButton: false
      });
    },
    onError: (error) => {
      console.error(error);
      Swal.fire('Error', 'No se pudo actualizar.', 'error');
    }
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    sendToKitchen: sendMutation.mutateAsync
  };
};