import api from '../api/axios'; 

export const financeService = {
    // PASO 2: Obtener lista para el cajero
    // Verifica que esta ruta (GET /orders) exista en tu backend.
    getPendingOrders: async () => {
        try {
            // Usamos la ruta con el filtro que definimos
            const response = await api.get('/orders?status=pending_payment');
            return response.data;
        } catch (error) {
            console.error("Error conectando con backend:", error);
            throw error;
        }
    },
    getAllInvoices: async () => {
        const { data } = await api.get('/finance/invoices');
        return data;
    },

    getDailyReport: async () => {
        const { data } = await api.get('/finance/invoices/report/daily');
        return data;
    },

    // NUEVO: Obtener UNA factura por ID (Para reimprimir)
    getInvoiceById: async (id) => {
        const { data } = await api.get(`/finance/invoices/${id}`);
        return data;
    },

    // Configuración
    getConfig: async () => {
        try {
            const response = await api.get('/finance/config');
            return response.data;
        } catch (error) { 
            return null; 
        }
    },

    updateConfig: async (data) => {
        const response = await api.put('/finance/config', data);
        return response.data;
    },

    // PASO 3: Facturar
    createInvoice: async ({ order_id, client_name, client_nit, payment_method }) => {
        const payload = { 
            order_id,
            payment_method: payment_method || 'EFECTIVO' // Por defecto Efectivo si falla algo
        };
        
        if (client_name && client_name.trim().length > 0) payload.client_name = client_name;
        if (client_nit && client_nit.trim().length > 0) payload.client_nit = client_nit;

        const response = await api.post('/finance/invoices', payload);
        return response.data;
    }

    
};