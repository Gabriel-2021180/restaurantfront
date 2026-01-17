import React from 'react';

const KitchenTicket = ({ ticket }) => {
  if (!ticket) return null;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    // Fondo blanco, texto negro, fuente monoespaciada (como ticket real)
    <div className="bg-white text-black font-mono p-2 w-full max-w-[80mm] border-2 border-dashed border-gray-300 mx-auto">
      
      {/* --- CABECERA (Sin fondo negro, solo texto GRANDE) --- */}
      <div className="text-center border-b-4 border-black pb-2 mb-2">
        <h1 className="text-3xl font-black uppercase leading-tight">
            {/* 🔥 AQUÍ ESTABA EL ERROR: Ya no ponemos "Mesa {ticket...}" */}
            {/* Solo mostramos lo que manda el backend: "MESA 5" o "LLEVAR: JUAN" */}
            {ticket.table_number}
        </h1>
        <div className="flex justify-between items-center mt-1 text-xs font-bold">
            <span>ORDEN: #{ticket.order_id}</span>
            <span>HORA: {formatTime(ticket.timestamp)}</span>
        </div>
        <p className="text-xs mt-1 uppercase">Atiende: {ticket.waiter_name}</p>
      </div>

      {/* --- CUERPO DEL PEDIDO --- */}
      <div className="space-y-4">
        {ticket.items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 border-b border-gray-400 pb-2 last:border-0">
            {/* Cantidad Gigante para que el cocinero no falle */}
            <span className="text-2xl font-black min-w-[1.5rem]">{item.qty}</span>
            
            <div className="flex-1">
              <p className="text-lg font-bold leading-tight uppercase">
                {item.product}
              </p>
              
              {/* Notas de cocina (Sin picante, etc.) */}
              {item.notes && (
                <p className="text-sm font-bold mt-1 bg-gray-100 p-1 rounded inline-block border border-gray-300">
                  ⚠️ {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- PIE DE PÁGINA --- */}
      <div className="mt-4 pt-2 border-t-2 border-black text-center">
        <p className="text-xs font-bold">*** FIN COMANDA ***</p>
        {ticket.batch_number > 1 && (
            <p className="text-sm font-black mt-1">📦 ENVÍO #{ticket.batch_number}</p>
        )}
      </div>
    </div>
  );
};

export default KitchenTicket;