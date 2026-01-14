import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import orderService from '../../services/orderService';
import userService from '../../services/userService'; // <--- IMPORTANTE: Lo necesitamos de vuelta
import KitchenTicket from '../../components/orders/KitchenTicket';

const KitchenPrintView = () => {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const [ticketData, setTicketData] = useState(null);
  const hasPrinted = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Cargar Historial y Orden
        const history = await orderService.getKitchenHistory(orderId);
        const fullOrder = await orderService.getOrder(orderId);
        
        const tableName = fullOrder.table?.table_number || t('kitchenPrintView.tableUnknown');
        const orderNum = fullOrder.order_number || "---";

        if (history && history.length > 0) {
             const sorted = history.sort((a, b) => {
                if (a.batch_number === 0) return -1;
                return b.batch_number - a.batch_number;
             });
             const batchToPrint = sorted[0];

             // --- LÓGICA DE RECUPERACIÓN DE NOMBRE (ESTRATEGIA TOTAL) ---
             let finalWaiterName = t('kitchenPrintView.unassigned');

             // CASO 1: Si el backend ya manda el nombre (Socket/Snapshot)
             if (batchToPrint.waiter_name) {
                 finalWaiterName = batchToPrint.waiter_name;
             } 
             // CASO 2: Si la orden principal tiene el objeto waiter cargado
             else if (fullOrder.waiter && fullOrder.waiter.first_names) {
                 finalWaiterName = `${fullOrder.waiter.first_names} ${fullOrder.waiter.last_names || ''}`;
             }
             // CASO 3: Si la orden fue creada por un usuario con nombre
             else if (fullOrder.user?.name) {
                 finalWaiterName = fullOrder.user.name;
             }
             
             // CASO 4 (EL SALVAVIDAS): Si solo tenemos el ID en el historial
             // Tu JSON muestra que history tiene "waiter_id". Usémoslo.
             if (finalWaiterName === t('kitchenPrintView.unassigned') && batchToPrint.waiter_id) {
                 try {
                     // Traemos la lista de usuarios para buscar quién es ese ID
                     const usersData = await userService.getAllUsers();
                     const usersList = Array.isArray(usersData) ? usersData : (usersData.data || []);
                     
                     const foundUser = usersList.find(u => u.id === batchToPrint.waiter_id);
                     if (foundUser) {
                         // A veces el user tiene 'name' o 'first_names' dependiendo de tu backend
                         finalWaiterName = foundUser.name || `${foundUser.first_names} ${foundUser.last_names}`;
                     }
                 } catch (err) {
                     console.error(t('kitchenPrintView.couldNotResolveNameById'), err);
                 }
             }

             setTicketData({
                 ...batchToPrint,
                 table_number: tableName,
                 order_number: orderNum,
                 waiter_name: finalWaiterName
             });
        }
      } catch (error) {
        console.error(t('kitchenPrintView.errorLoadingTicket'), error);
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
        <KitchenTicket 
            data={ticketData} 
            batchNumber={ticketData.batch_number} 
            sentAt={ticketData.sent_at || ticketData.created_at} 
        />
    </div>
  );
};

export default KitchenPrintView;