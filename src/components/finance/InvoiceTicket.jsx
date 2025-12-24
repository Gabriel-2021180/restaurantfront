import React from 'react';
import { QRCodeSVG } from 'qrcode.react'; 

const InvoiceTicket = ({ invoice }) => {
  if (!invoice) return null;

  // 1. EXTRAER CONFIGURACIÓN (Según tu JSON viene en 'business_config')
  const config = invoice.business_config || {}; 
  
  // 2. EXTRAER DETALLES (Están en invoice.order.details o invoice.details)
  const order = invoice.order || {};
  // A veces el backend manda los detalles directos en 'invoice.order.details'
  const details = Array.isArray(order.details) ? order.details : [];

  // Helpers de fecha
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div id="invoice-ticket-container" className="w-[80mm] mx-auto bg-white text-black p-4 font-mono text-[10px] leading-tight shadow-lg">
      
      {/* --- ENCABEZADO --- */}
      <div className="text-center mb-3">
        <h1 className="font-bold text-xs uppercase mb-1">{config.name || "NOMBRE RESTAURANTE"}</h1>
        <p className="uppercase mb-1">CASA MATRIZ</p>
        <p className="mb-1">{config.address || "Dirección no configurada"}</p>
        <p className="mb-2">Tel: {config.phone || "S/N"}</p>
        
        <h2 className="font-bold text-xs mt-3 mb-1">FACTURA</h2>
        
        <div className="space-y-0.5">
            <p>(Con Derecho a Crédito Fiscal)</p>
            <div className="flex justify-between px-1 mt-1">
                <span>NIT:</span>
                <span>{config.nit || invoice.nit_emisor}</span>
            </div>
            <div className="flex justify-between px-1">
                <span>FACTURA Nº:</span>
                <span>{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between px-1">
                <span>COD. AUT.:</span>
            </div>
            <p className="break-all px-1 text-center">{invoice.authorization_code}</p>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* --- DATOS CLIENTE --- */}
      <div className="space-y-1 mb-2">
        <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formatDate(invoice.transaction_date)} {formatTime(invoice.transaction_date)}</span>
        </div>
        <div className="flex flex-col">
            <span className="font-bold">Señor(es):</span>
            <span className="uppercase">{invoice.client_name || "SIN NOMBRE"}</span>
        </div>
        <div className="flex gap-2">
            <span className="font-bold">NIT/CI:</span>
            <span>{invoice.client_nit || "0"}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* --- DETALLE (AQUÍ ESTABA EL ERROR DE NaN) --- */}
      <div className="mb-2">
        <div className="flex font-bold mb-1">
            <span className="w-6">CNT</span>
            <span className="flex-1">DETALLE</span>
            <span className="w-10 text-right">SUB.</span>
        </div>
        
        {details.length > 0 ? (
            details.map((item, index) => {
                // CORRECCIÓN CLAVE: Usamos 'price_at_purchase' que viene del JSON
                const price = parseFloat(item.price_at_purchase) || 0;
                const qty = item.quantity || 1;
                const subtotal = price * qty;

                return (
                    <div key={index} className="flex mb-1">
                        <span className="w-6">{qty}</span>
                        <div className="flex-1 pr-1">
                            <span className="block uppercase">
                                {item.product_name || item.product?.name || "Item"}
                            </span>
                            {/* Precio unitario pequeño */}
                            <span className="text-[9px] text-gray-600">
                                {price.toFixed(2)}
                            </span>
                        </div>
                        <span className="w-10 text-right">
                            {subtotal.toFixed(2)}
                        </span>
                    </div>
                );
            })
        ) : (
            <div className="text-center italic py-2">Detalles no disponibles</div>
        )}
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* --- TOTALES --- */}
      <div className="space-y-1 text-right mb-3">
        <div className="flex justify-between">
            <span>SUBTOTAL Bs:</span>
            <span>{parseFloat(invoice.total_amount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
            <span>DESCUENTO Bs:</span>
            <span>0.00</span>
        </div>
        <div className="flex justify-between font-bold text-xs mt-1">
            <span>TOTAL A PAGAR Bs:</span>
            <span>{parseFloat(invoice.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-4 uppercase text-[9px]">
        <span className="font-bold">SON: </span>
        {invoice.literal_amount || "MONTO EN BOLIVIANOS"}
      </div>

      {/* --- QR Y CODIGO CONTROL --- */}
      <div className="text-center mb-4">
        <p className="mb-2">Código de Control: <span className="font-bold">{invoice.control_code || "A1-B2-C3-D4"}</span></p>
        
        <div className="flex justify-center my-2">
             <QRCodeSVG 
                value={`https://siat.impuestos.gob.bo/qr?nit=${config.nit || invoice.nit_emisor}&cuf=${invoice.authorization_code}&numero=${invoice.invoice_number}&t=${invoice.total_amount}`} 
                size={90} 
             />
        </div>
        
        <p className="text-[8px] mt-1">FECHA LÍMITE DE EMISIÓN: {formatDate(invoice.deadline_date || "2025-12-31")}</p>
      </div>

      {/* --- LEYENDAS --- */}
      <div className="text-center text-[8px] space-y-1">
        <p className="font-bold">{invoice.legend_law}</p>
        <p className="mt-2 italic">{invoice.legend_rights || "Ley N° 453"}</p>
        <p className="mt-2">Gracias por su preferencia</p>
      </div>

    </div>
  );
};

export default InvoiceTicket;