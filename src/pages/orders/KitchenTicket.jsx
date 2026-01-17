import React from 'react';

const KitchenTicket = ({ ticket }) => {
  if (!ticket) return null;

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 🔥 LÓGICA UNIFICADA: Si no hay mesa o es S/N, mostrar PARA LLEVAR
  const getTableDisplayName = (text) => {
      if (!text || text === 'S/N' || text === '??') {
          return 'PARA LLEVAR'; 
      }
      const upper = String(text).toUpperCase();
      if (upper.includes('MESA') || upper.includes('LLEVAR') || upper.includes('BARRA')) {
          return text;
      }
      return `MESA ${text}`;
  };

  return (
    <div id="invoice-ticket-container" className="bg-white text-black font-mono p-2 w-full max-w-[80mm] border-2 border-dashed border-gray-300 mx-auto">
      <div className="text-center border-b-4 border-black pb-2 mb-2">
        <h1 className="text-3xl font-black uppercase leading-tight">
            {getTableDisplayName(ticket.table_number)}
        </h1>
        <div className="flex justify-between items-center mt-1 text-xs font-bold">
            <span>ORDEN: #{ticket.order_id || ticket.order_number}</span>
            <span>HORA: {formatTime(ticket.timestamp || ticket.sent_at)}</span>
        </div>
        <p className="text-xs mt-1 uppercase">Atiende: {ticket.waiter_name}</p>
      </div>

      <div className="space-y-4">
        {ticket.items && ticket.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 border-b border-gray-400 pb-2 last:border-0">
            <span className="text-2xl font-black min-w-[1.5rem]">{item.qty || item.quantity}</span>
            <div className="flex-1">
              <p className="text-lg font-bold leading-tight uppercase">
                {item.product || item.product_name}
              </p>
              {item.notes && (
                <p className="text-sm font-bold mt-1 bg-gray-100 p-1 rounded inline-block border border-gray-300">
                  ⚠️ {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-2 border-t-2 border-black text-center">
        <p className="text-xs font-bold">*** FIN COMANDA ***</p>
      </div>
    </div>
  );
};

export default KitchenTicket;