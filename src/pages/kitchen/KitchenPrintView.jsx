import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import orderService from '../../services/orderService';
import KitchenTicket from '../../components/orders/KitchenTicket';
import { Loader2 } from 'lucide-react';

const KitchenPrintView = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const [ticketData, setTicketData] = useState(null);
  const hasPrinted = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 🚀 OPTIMIZACIÓN 1: Carga en PARALELO (Ahorra 50% de tiempo de red)
        const [history, fullOrder] = await Promise.all([
            orderService.getKitchenHistory(orderId),
            orderService.getOrder(orderId)
        ]);
        
        // --- LÓGICA DE TÍTULO ---
        let finalTitle = "PARA LLEVAR"; 

        if (fullOrder.table) {
            // Limpieza robusta del nombre de la mesa
            const rawTable = String(fullOrder.table.table_number);
            const cleanNumber = rawTable.replace(/mesa/gi, '').replace(/[-]/g, '').trim();
            finalTitle = `MESA ${cleanNumber}`;
        } else if (fullOrder.order_type === 'dine_in' && !fullOrder.table) {
            finalTitle = "MESA S/N"; 
        } else {
            const clientName = fullOrder.client_name || fullOrder.pickup_name || "CLIENTE";
            finalTitle = `LLEVAR: ${clientName}`;
        }

        const orderNum = fullOrder.order_number || "---";

        if (history && history.length > 0) {
             const sorted = history.sort((a, b) => b.batch_number - a.batch_number);
             const batchToPrint = sorted[0];

             let finalWaiterName = "Sin Asignar";
             if (batchToPrint.waiter_name) finalWaiterName = batchToPrint.waiter_name;
             else if (fullOrder.waiter) finalWaiterName = `${fullOrder.waiter.first_names} ${fullOrder.waiter.last_names || ''}`;

             setTicketData({
                 ...batchToPrint,
                 display_title: finalTitle.toUpperCase(),
                 order_number: orderNum,
                 waiter_name: finalWaiterName
             });
        }
      } catch (error) {
        console.error("Error cargando ticket", error);
      }
    };

    if (orderId) loadData();
  }, [orderId]);

  useEffect(() => {
    if (ticketData && !hasPrinted.current) {
      hasPrinted.current = true; 
      // 🚀 OPTIMIZACIÓN 2: Bajamos de 500ms a 100ms. 
      // Es suficiente para que React renderice y se siente instantáneo.
      setTimeout(() => window.print(), 100);
    }
  }, [ticketData]);

  if (!ticketData) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12"/></div>;

  return (
    <div className="w-[80mm] bg-white">
        <KitchenTicket data={ticketData} />
    </div>
  );
};

export default KitchenPrintView;