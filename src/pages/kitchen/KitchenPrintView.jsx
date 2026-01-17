import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import orderService from '../../services/orderService';
import userService from '../../services/userService';
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
        const history = await orderService.getKitchenHistory(orderId);
        const fullOrder = await orderService.getOrder(orderId);
        
        // 🔥 LÓGICA DE NOMBRE DE MESA O CLIENTE 🔥
        // Si no hay mesa, usamos el nombre del cliente para llevar
        const tableName = fullOrder.table?.table_number || fullOrder.client_name || fullOrder.pickup_name || "PARA LLEVAR";
        const orderNum = fullOrder.order_number || "---";

        if (history && history.length > 0) {
             const sorted = history.sort((a, b) => b.batch_number - a.batch_number);
             const batchToPrint = sorted[0];

             let finalWaiterName = "Sin Asignar";
             if (batchToPrint.waiter_name) finalWaiterName = batchToPrint.waiter_name;
             else if (fullOrder.waiter) finalWaiterName = `${fullOrder.waiter.first_names} ${fullOrder.waiter.last_names || ''}`;

             setTicketData({
                 ...batchToPrint,
                 table_number: tableName,
                 client_name: fullOrder.client_name || fullOrder.pickup_name, // 🔥 ESTA LÍNEA ES VITAL
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
      setTimeout(() => window.print(), 500);
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