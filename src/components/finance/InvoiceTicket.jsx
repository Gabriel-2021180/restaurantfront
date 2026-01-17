import React from 'react';
import { QRCodeSVG } from 'qrcode.react'; 

const InvoiceTicket = ({ invoice }) => {
  if (!invoice) return null;

  const config = invoice.business_config || {}; 
  const order = invoice.order || {};
  const details = Array.isArray(order.details) ? order.details : (invoice.details || []);

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
    // ID CRÍTICO: invoice-ticket-container
    <div id="invoice-ticket-container" className="bg-white text-black font-mono w-full max-w-[80mm]">
      
      {/* CABECERA */}
      <div className="text-center mb-2">
        <h1 className="font-black text-sm uppercase mb-1">{config.name || "RESTAURANTE"}</h1>
        <p className="text-[10px] uppercase mb-1">CASA MATRIZ</p>
        <p className="text-[10px] mb-1 leading-tight">{config.address || "Dirección no configurada"}</p>
        <p className="text-[10px]">Tel: {config.phone || "S/N"}</p>
        
        <h2 className="font-bold text-sm border-y-2 border-black border-dashed py-1 my-2">FACTURA</h2>
        
        <div className="text-center text-[10px] space-y-0.5">
            <p className="mb-1 text-[8px] uppercase">(Con Derecho a Crédito Fiscal)</p>
            <div className="flex justify-between"><span>NIT:</span><span className="font-bold">{config.nit || invoice.nit_emisor}</span></div>
            <div className="flex justify-between"><span>FACTURA Nº:</span><span className="font-bold">{invoice.invoice_number}</span></div>
            <div className="flex justify-between"><span>COD. AUT.:</span></div>
            <p className="break-all text-[9px] font-bold text-center leading-none">{invoice.authorization_code}</p>
        </div>
      </div>

      <hr className="border-t-2 border-dashed border-black my-1"/>

      {/* CLIENTE */}
      <div className="space-y-0.5 mb-1 text-[10px]">
        <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formatDate(invoice.transaction_date)} {formatTime(invoice.transaction_date)}</span>
        </div>
        <div className="flex flex-col text-left">
            <span>Señor(es):</span>
            <span className="font-bold uppercase">{invoice.client_name || "SIN NOMBRE"}</span>
        </div>
        <div className="flex gap-2"><span>NIT/CI:</span><span className="font-bold">{invoice.client_nit || "0"}</span></div>
      </div>

      <hr className="border-t-2 border-dashed border-black my-1"/>

      {/* DETALLE */}
      <div className="mb-1 text-[10px]">
        <div className="flex font-bold mb-1 pb-1">
            <span className="w-6 text-left">CNT</span>
            <span className="flex-1 text-left px-1">DETALLE</span>
            <span className="w-12 text-right">SUB.</span>
        </div>
        
        {details.length > 0 ? (
            details.map((item, index) => {
                const price = parseFloat(item.price_at_purchase) || 0;
                const qty = item.quantity || 1;
                const subtotal = price * qty;

                return (
                    <div key={index} className="flex mb-1 items-start">
                        <span className="w-6 text-left">{qty}</span>
                        <div className="flex-1 px-1 overflow-hidden leading-tight">
                            <span className="block uppercase font-bold">{item.product_name || "Item"}</span>
                            <span className="text-[9px]">{price.toFixed(2)} c/u</span>
                        </div>
                        <span className="w-12 text-right">{subtotal.toFixed(2)}</span>
                    </div>
                );
            })
        ) : (
            <div className="text-center italic">-- Sin Items --</div>
        )}
      </div>

      <hr className="border-t-2 border-black my-1"/>

      {/* TOTALES */}
      <div className="space-y-1 text-right mb-2 text-[11px]">
        <div className="flex justify-between font-black">
            <span>TOTAL Bs:</span>
            <span className="text-base">{parseFloat(invoice.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-2 uppercase text-[9px] text-left border-b border-black pb-2">
        <span className="font-bold">SON: </span>{invoice.literal_amount || "MONTO EN BOLIVIANOS"}
      </div>

      {/* QR Y PIE */}
      <div className="text-center">
        <p className="mb-1 text-[9px]">Código de Control: <span className="font-bold">{invoice.control_code}</span></p>
        <div className="flex justify-center my-2">
             <QRCodeSVG 
                value={`https://siat.impuestos.gob.bo/qr?nit=${config.nit}&cuf=${invoice.authorization_code}&numero=${invoice.invoice_number}&t=${invoice.total_amount}`} 
                size={110} 
             />
        </div>
        <p className="text-[9px] font-bold">LÍMITE DE EMISIÓN:</p>
        <p className="text-[9px]">{formatDate(invoice.deadline_date)}</p>
        <p className="mt-2 text-[8px] italic leading-tight uppercase">"{invoice.legend_law}"</p>
        <p className="mt-1 text-[7px] leading-tight">"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LEY"</p>
      </div>
    </div>
  );
};

export default InvoiceTicket;