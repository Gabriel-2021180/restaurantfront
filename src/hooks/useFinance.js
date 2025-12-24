import { useState, useCallback, useRef } from 'react';
import { financeService } from '../services/financeService';

export const useFinance = () => {
    const [loading, setLoading] = useState(false);
    const [pendingOrders, setPendingOrders] = useState([]);
    
    // Contador de errores para evitar bucles infinitos
    const errorCount = useRef(0);

    const loadPendingOrders = useCallback(async () => {
        // Si ha fallado más de 3 veces seguidas, PAUSAMOS las peticiones
        if (errorCount.current > 3) {
            console.warn("Backend no responde (404/500). Se han pausado las actualizaciones automáticas.");
            return;
        }

        try {
            setLoading(true);
            const data = await financeService.getPendingOrders();
            
            // Si el backend devuelve array, lo usamos. Si no, array vacío.
            setPendingOrders(Array.isArray(data) ? data : []);
            
            // Si tiene éxito, reseteamos el contador de errores
            errorCount.current = 0; 

        } catch (error) {
            console.error("Error cargando pedidos en Caja:", error.message);
            errorCount.current += 1; // Aumentamos el contador de fallos
        } finally {
            setLoading(false);
        }
    }, []);

    const generateInvoice = async (data) => {
        setLoading(true);
        try {
            const invoice = await financeService.createInvoice(data);
            return invoice;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (data) => {
        return await financeService.updateConfig(data);
    };

    return { 
        loading, 
        pendingOrders, 
        loadPendingOrders, 
        generateInvoice,
        saveSettings
    };
};