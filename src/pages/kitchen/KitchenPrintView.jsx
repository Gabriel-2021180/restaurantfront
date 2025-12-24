import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import orderService from '../../services/orderService';
import KitchenTicket from '../../components/orders/KitchenTicket';

const KitchenPrintView = () => {
  const { orderId } = useParams();
  const [ticketData, setTicketData] = useState(null);
  
  // CANDADO PARA EVITAR DOBLE IMPRESIÓN
  const hasPrinted = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const history = await orderService.getKitchenHistory(orderId);
        const fullOrder = await orderService.getOrder(orderId);
        
        const tableName = fullOrder.table?.table_number || "Mesa ??";
        const orderNum = fullOrder.order_number || "---";

        if (history && history.length > 0) {
             // Priorizamos la tanda pendiente (0) o la última enviada
             const sorted = history.sort((a, b) => {
                if (a.batch_number === 0) return -1;
                return b.batch_number - a.batch_number;
             });
             
             const batchToPrint = sorted[0];

             setTicketData({
                 ...batchToPrint,
                 table_number: tableName,
                 order_number: orderNum
             });
        }
      } catch (error) {
        console.error("Error cargando ticket", error);
      }
    };

    if (orderId) loadData();
  }, [orderId]);

  // EFECTO DE IMPRESIÓN CONTROLADA
  useEffect(() => {
    if (ticketData && !hasPrinted.current) {
      hasPrinted.current = true; // Marcamos como "Imprimiendo"
      
      setTimeout(() => {
        window.print();
        // Opcional: Cerrar la ventana si se abrió como popup
        // window.close(); 
      }, 500);
    }
  }, [ticketData]);

  if (!ticketData) return <div className="p-4 font-mono text-center text-sm">Preparando ticket...</div>;

  return (
    <div className="w-[80mm] bg-white">
        <KitchenTicket 
            data={ticketData} 
            batchNumber={ticketData.batch_number} 
            sentAt={ticketData.sent_at} 
        />
    </div>
  );
};

export default KitchenPrintView;