import React from 'react';

const KitchenTicket = ({ data, batchNumber, sentAt }) => {
  if (!data) return null;

  const formatTime = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const items = data.items || [];
  const title = batchNumber === 0 ? 'NUEVOS ITEMS' : `TANDA #${batchNumber}`;

  return (
    // Reutilizamos el ID 'invoice-ticket-container' para que el CSS global lo capture y le de el tamaño 80mm
    <div id="invoice-ticket-container" className="bg-white text-black p-2 font-mono leading-tight w-full mx-auto border-b-2 border-dashed border-black">
      
      {/* CABECERA COCINA */}
      <div className="text-center pb-2 mb-2 border-b-4 border-black">
        <p className="text-xs font-bold uppercase mb-1">ORDEN DE COCINA</p>
        <h1 className="text-xl font-black my-1 uppercase">{title}</h1>
        
        <div className="my-1 py-1 border-y-2 border-black">
            <h2 className="text-2xl font-black">MESA {data.table_number}</h2>
        </div>
        
        {data.waiter_name && (
            <p className="text-xs font-bold uppercase mt-1">
                MESERO: <span className="bg-black text-white px-1">{data.waiter_name}</span>
            </p>
        )}

        <div className="flex justify-between text-xs font-bold mt-2 px-1">
            <span>Hora: {sentAt ? formatTime(sentAt) : '--:--'}</span>
            <span>Items: {items.length}</span>
        </div>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="py-1 space-y-2">
        {items.length > 0 ? (
            items.map((item, index) => (
                <div key={index} className="border-b border-gray-400 pb-2">
                    <div className="flex gap-2 items-start">
                        {/* Cantidad Gigante */}
                        <span className="font-black text-2xl w-8 text-center leading-none mt-1">{item.quantity}</span>
                        
                        <div className="flex-1 text-left">
                            {/* Nombre Producto */}
                            <span className="font-bold text-lg block leading-5 mb-1 uppercase">
                                {item.name || item.product_name || item.product?.name}
                            </span>
                            
                            {/* Notas */}
                            {item.notes && (
                                <div className="mt-1">
                                    <span className="text-xs font-bold bg-black text-white inline-block px-1 py-0.5 rounded uppercase">
                                        NOTA: {item.notes}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <p className="text-center italic">-- Comanda Vacía --</p>
        )}
      </div>

      <div className="text-center mt-4 pt-2 border-t-4 border-black">
        <p className="font-bold text-sm">*** FIN DE TANDA ***</p>
      </div>
    </div>
  );
};

export default KitchenTicket;