import { useState, useEffect, useCallback } from 'react';
import { financeService } from '../services/financeService';
import Swal from 'sweetalert2';

export const useCashRegister = () => {
  const [session, setSession] = useState(null); // Datos de la sesión actual
  const [isRegisterOpen, setIsRegisterOpen] = useState(null); // null=cargando, true=abierta, false=cerrada
  const [loading, setLoading] = useState(true);

  // 1. VERIFICAR ESTADO AL INICIAR
  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await financeService.getCashRegisterStatus();
      setSession(data);
      setIsRegisterOpen(true);
    } catch (error) {
      // Si es 404, es que NO hay caja abierta. Eso es bueno (sabemos que está cerrada)
      if (error.response && error.response.status === 404) {
        setSession(null);
        setIsRegisterOpen(false);
      } else {
        console.error("Error verificando caja:", error);
        // Opcional: Mostrar error si es algo técnico (500)
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 2. ABRIR CAJA
  const openRegister = async (amount) => {
    try {
      await financeService.openCashRegister(parseFloat(amount));
      Swal.fire('¡Turno Iniciado!', 'Caja abierta correctamente.', 'success');
      checkStatus(); // Recargar estado para desbloquear pantalla
      return true;
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo abrir la caja.', 'error');
      return false;
    }
  };

  // 3. CERRAR CAJA (CORTE)
  const closeRegister = async (countedCash, notes) => {
    try {
      const result = await financeService.closeCashRegister({ 
          cash_count: parseFloat(countedCash), 
          notes 
      });
      
      // Mostrar resumen final
      const diff = result.difference || 0; // Asumiendo que el back devuelve la diferencia
      const diffMsg = diff === 0 ? 'Cuadre Perfecto' : (diff > 0 ? `Sobra: ${diff}` : `Falta: ${diff}`);
      
      await Swal.fire({
          title: 'Corte Realizado',
          text: `Caja cerrada. ${diffMsg}`,
          icon: diff < 0 ? 'warning' : 'success'
      });

      setSession(null);
      setIsRegisterOpen(false); // Esto bloqueará la pantalla de nuevo (Modal Apertura)
      return true;

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cerrar la caja.', 'error');
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