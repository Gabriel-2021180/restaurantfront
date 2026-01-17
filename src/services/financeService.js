import api from '../api/axios'; 

// 🔥 CORRECCIÓN: Usamos 'export default' para que se pueda importar sin llaves {}
export default {
    // PASO 2: Obtener lista para el cajero
    getPendingOrders: async () => {
        try {
            const response = await api.get('/orders?status=pending_payment');
            return response.data;
        } catch (error) {
            console.error("Error conectando con backend:", error);
            throw error;
        }
    },

    getDailyShifts: async (date) => {
        const query = date ? `?date=${date}` : '';
        const { data } = await api.get(`/finance/cash-register/daily-shifts${query}`);
        return data;
    },

    getAllInvoices: async (type = 'dine_in', period = 'day', from = null, to = null, page = 1, limit = 10) => {
        let query = `?type=${type}&page=${page}&limit=${limit}`;
        
        if (from && to) {
            query += `&from=${from}&to=${to}`;
        } else if (period) {
            query += `&period=${period}`;
        }

        const { data } = await api.get(`/finance/invoices${query}`);
        return data;
    },

    getDailyReport: async () => {
        const { data } = await api.get('/finance/invoices/report/daily');
        return data;
    },

    getInvoiceById: async (id) => {
        const { data } = await api.get(`/finance/invoices/${id}`);
        return data;
    },

    // Configuración
    getSettings: async () => { // <--- RENOMBRADO A getSettings PARA COINCIDIR CON TU COMPONENTE
        try {
            const response = await api.get('/finance/config');
            return response.data;
        } catch (error) { 
            return null; 
        }
    },

    updateSettings: async (data) => { // <--- RENOMBRADO A updateSettings
        const response = await api.put('/finance/config', data);
        return response.data;
    },

    // PASO 3: Facturar
    createInvoice: async ({ order_id, client_name, client_nit, payment_method }) => {
        const payload = { 
            order_id,
            payment_method: payment_method || 'EFECTIVO' 
        };
        
        if (client_name && client_name.trim().length > 0) payload.client_name = client_name;
        if (client_nit && client_nit.trim().length > 0) payload.client_nit = client_nit;

        const response = await api.post('/finance/invoices', payload);
        return response.data;
    },

    getCashRegisterStatus: async () => {
        const { data } = await api.get('/finance/cash-register/status');
        return data;
    },

    openCashRegister: async (starting_cash) => {
        const { data } = await api.post('/finance/cash-register/open', { starting_cash });
        return data;
    },

    closeCashRegister: async ({ cash_count, notes }) => {
        const { data } = await api.post('/finance/cash-register/close', { cash_count, notes });
        return data;
    }

    
};