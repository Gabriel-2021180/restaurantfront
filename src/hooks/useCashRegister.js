import { useState, useEffect, useCallback } from 'react';
import  financeService  from '../services/financeService';
import Swal from 'sweetalert2';

export const useCashRegister = () => {
  const [session, setSession] = useState(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeService.getCashRegisterStatus(); 
      setSession(data);
      setIsRegisterOpen(true);
    } catch (error) {
       setIsRegisterOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const openRegister = async (amount) => {
    try {
      await financeService.openCashRegister(parseFloat(amount));
      Swal.fire('¡Turno Iniciado!', 'Caja abierta correctamente.', 'success');
      checkStatus();
      return true;
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo abrir la caja.', 'error');
      return false;
    }
  };

  const closeRegister = async ({ cash_count, notes }) => {
    try {
      const result = await financeService.closeCashRegister({ 
          cash_count: parseFloat(cash_count), 
          notes 
      });
      
      const diff = result.difference || 0;
      const diffMsg = diff === 0 ? 'Cuadre Perfecto' : (diff > 0 ? `Sobra: ${diff}` : `Falta: ${diff}`);
      
      await Swal.fire({
          title: 'Corte Realizado',
          text: `Caja cerrada. ${diffMsg}`,
          icon: diff < 0 ? 'warning' : 'success'
      });

      setSession(null);
      setIsRegisterOpen(false);
      return true;

    } catch (error) {
      console.error("Error al cerrar caja:", error);
      
      // 🔥 AQUÍ ESTÁ EL CAMBIO CLAVE PARA LEER TU FILTRO DE NESTJS 🔥
      const responseData = error.response?.data;
      
      // 1. Intentamos leer dentro de 'error' (por tu filtro http-exception)
      let serverMessage = responseData?.error?.message; 
      
      // 2. Si no estaba ahí, intentamos leerlo directo (por si el filtro falló o es otro tipo de error)
      if (!serverMessage) {
          serverMessage = responseData?.message;
      }

      // 3. Formateamos si es un array (validaciones)
      const displayMessage = serverMessage 
          ? (Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage)
          : 'Ocurrió un error inesperado al cerrar la caja.';

      // 4. Mostramos la alerta con el mensaje CORRECTO
      await Swal.fire({
          title: 'No se pudo cerrar',
          text: displayMessage, // Ahora sí saldrá: "⛔ ACCESO DENEGADO..."
          icon: 'error',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Entendido'
      });
      
      return false;
    }
  };

  return {
    isRegisterOpen,
    session,
    loading,
    checkStatus,
    openRegister,
    closeRegister
  };
};