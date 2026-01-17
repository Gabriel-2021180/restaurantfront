import React from 'react';

const KitchenTicket = ({ ticket, data, batchNumber, sentAt }) => {
  // 1. Unificar datos (soporta ambas versiones de tu código)
  const record = ticket || data;
  if (!record) return null;

  // 2. Extraer valores
  const items = record.items || [];
  const waiter = record.waiter_name || 'Sin Asignar';
  const orderId = record.order_id || '???';
  
  const batch = batchNumber !== undefined ? batchNumber : (record.batch_number || 1);
  const time = sentAt || record.timestamp || new Date();
  const title = batch === 0 ? 'NUEVOS ITEMS' : `TANDA #${batch}`;

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 🔥 LÓGICA CORREGIDA: SI NO HAY MESA -> PARA LLEVAR 🔥
  const getTableDisplayName = (text) => {
      // Si es nulo, undefined, vacío o "S/N", asumimos que es PARA LLEVAR
      if (!text || text === 'S/N') {
          return 'PARA LLEVAR'; 
      }

      const upper = String(text).toUpperCase();

      // Si ya dice "LLEVAR", "MESA" o "BARRA", lo dejamos tal cual
      if (upper.includes('MESA') || upper.includes('LLEVAR') || upper.includes('BARRA') || upper.includes('WEB')) {
          return text;
      }

      // Si solo es un número (ej: "5"), le agregamos "MESA"
      return `MESA ${text}`;
  };

  return (
    <div id="invoice-ticket-container" className="bg-white text-black font-mono w-full max-w-[80mm] mx-auto p-1">
      
      {/* CABECERA (Blanca con bordes negros para ahorrar tinta) */}
      <div className="text-center pb-2 mb-2 border-b-4 border-black">
        <p className="text-[10px] font-bold uppercase mb-1">ORDEN DE COCINA</p>
        <h1 className="text-xl font-black uppercase leading-none mb-2">{title}</h1>
        
        {/* NOMBRE GIGANTE DE LA MESA O CLIENTE */}
        <div className="border-2 border-black border-dashed py-2 my-1">
            <h2 className="text-2xl font-black uppercase leading-tight px-1 break-words">
                {getTableDisplayName(record.table_number)}
            </h2>
        </div>

        <div className="flex justify-between items-end mt-1 px-1">
            <div className="text-left">
                
                <p className="text-[10px] uppercase font-bold">ATIENDE: {waiter}</p>
            </div>
            <div className="text-right">
                <p className="text-xl font-black">{formatTime(time)}</p>
            </div>
        </div>
      </div>

      {/* LISTA DE ITEMS */}
      <div className="space-y-0">
        {items.length > 0 ? (
            items.map((item, index) => (
                <div key={index} className="border-b border-gray-400 py-2 flex gap-2 items-start">
                    
                    {/* CANTIDAD GRANDE */}
                    <span className="font-black text-3xl w-10 text-center leading-none mt-0.5">
                        {item.quantity}
                    </span>
                    
                    <div className="flex-1">
                        {/* NOMBRE PRODUCTO */}
                        <span className="font-bold text-lg block leading-tight uppercase">
                            {item.name || item.product_name || item.product?.name}
                        </span>
                        
                        {/* NOTAS (Con borde simple en vez de fondo negro) */}
                        {item.notes && (
                            <div className="mt-1">
                                <span className="text-sm font-bold border-2 border-black px-1 rounded uppercase inline-block">
                                    ⚠️ {item.notes}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            ))
        ) : (
            <p className="text-center italic text-xs py-4">-- Sin Items --</p>
        )}
      </div>

      {/* PIE */}
      <div className="text-center mt-4 pt-2 border-t-4 border-black">
        <p className="font-black text-xs">*** FIN DE ORDEN ***</p>
      </div>
    </div>
  );
};

export default KitchenTicket;