import React from 'react';

const KitchenTicket = ({ data, batchNumber, sentAt }) => {
  if (!data) return null;

  // Helpers de fecha
  const formatTime = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 1. Detectamos items según tu nuevo JSON ({ name, quantity }) o el viejo
  const items = data.items || [];
  
  // 2. Título dinámico
  // Si batchNumber es 0, es "POR MARCHAR". Si no, es "TANDA #X".
  const title = batchNumber === 0 ? 'NUEVOS ITEMS (Pre-visualización)' : `TANDA #${batchNumber}`;

  return (
    <div id="invoice-ticket-container" className="w-[80mm] mx-auto bg-white text-black p-4 font-mono leading-tight shadow-lg border border-gray-200">
      
      {/* CABECERA */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <p className="text-sm font-bold uppercase">ORDEN DE COCINA</p>
        <h1 className="text-xl font-bold my-1">{title}</h1>
        <h2 className="text-4xl font-black my-2">MESA {data.table_number}</h2>
        
        <div className="flex justify-between text-xs font-bold mt-1">
            <span>Enviado:</span>
            <span>{sentAt ? formatTime(sentAt) : 'Pendiente'}</span>
        </div>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="py-2 space-y-3">
        {items.length > 0 ? (
            items.map((item, index) => (
                <div key={index} className="border-b border-dashed border-gray-400 pb-2">
                    <div className="flex gap-2 items-start">
                        {/* Cantidad */}
                        <span className="font-black text-xl w-8">{item.quantity}</span>
                        <div className="flex-1">
                            {/* Nombre (Soporta 'name' del nuevo JSON o 'product.name' del viejo) */}
                            <span className="font-bold text-lg block leading-none mb-1">
                                {item.name || item.product_name || item.product?.name}
                            </span>
                            {/* Notas */}
                            {item.notes && (
                                <p className="text-sm font-bold bg-black text-white inline-block px-1 rounded">
                                    *** {item.notes} ***
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <p className="text-center italic">Sin items</p>
        )}
      </div>

      <div className="text-center mt-4 border-t-2 border-black pt-2">
        <p className="font-bold text-sm">*** FIN DE TANDA ***</p>
      </div>
      
    </div>
  );
};

export default KitchenTicket;