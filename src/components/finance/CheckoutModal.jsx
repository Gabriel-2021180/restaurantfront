import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, User, CheckCircle, Loader2, Banknote, QrCode, CreditCard, Printer, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/ui/Modal'; 
import InvoiceTicket from './InvoiceTicket'; 
import Swal from 'sweetalert2';

const CheckoutModal = ({ isOpen, onClose, onInvoiceGenerated }) => {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [clientData, setClientData] = useState({ nit: '', name: '' });
    const [generatedInvoice, setGeneratedInvoice] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setGeneratedInvoice(null);
            setPaymentMethod('EFECTIVO');
            setClientData({ nit: '', name: '' });
        }
    }, [isOpen]);

    const handleCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Llamamos al padre y esperamos la factura creada
            const invoice = await onInvoiceGenerated({
                nit: clientData.nit || '0',
                name: clientData.name || 'SIN NOMBRE',
                payment_method: paymentMethod
            });

            if (invoice && invoice.id) {
                setGeneratedInvoice(invoice);
                Swal.fire({
                    icon: 'success', title: '¡Facturado!', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false
                });
            } else {
                onClose(); // Si no devuelve nada, cerramos
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // 🔥 FUNCIÓN DE IMPRESIÓN CORREGIDA (IFRAME) 🔥
    const handlePrint = () => {
        const printContent = document.getElementById('modal-print-area');
        if (!printContent) return;

        // 1. Guardar el título original de la página (Ej: "RestoAdmin")
        const originalTitle = document.title;
        
        // 2. Definir el nombre del archivo deseado
        const invoiceNum = generatedInvoice?.invoice_number || 'SN';
        const fileName = `Factura_No_${invoiceNum}`; // Esto será el nombre del PDF

        // 3. Crear Iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write('<html><head>');
        
        // Copiar estilos
        Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach(s => {
            doc.write(s.outerHTML);
        });

        // CSS para centrar
        doc.write(`
            <style>
                @media print {
                    body {
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        background-color: white;
                        padding-top: 10px;
                    }
                    #modal-print-area {
                        width: 100%;
                        max-width: 80mm;
                        box-shadow: none;
                        border: none;
                    }
                    .no-print, button { display: none !important; }
                }
            </style>
        `);
        doc.write('</head><body>');
        doc.write(printContent.innerHTML);
        doc.write('</body></html>');
        doc.close();

        // 🔥 EL TRUCO FINAL: Cambiamos el título de la pestaña principal
        // El navegador usa ESTE título para el nombre del archivo al imprimir un iframe en algunos casos
        document.title = fileName;
        iframe.contentWindow.document.title = fileName; // Intentamos también en el iframe por si acaso

        iframe.contentWindow.focus();
        setTimeout(() => {
            iframe.contentWindow.print();
            
            // 4. Restaurar título original y limpiar
            setTimeout(() => {
                document.title = originalTitle; // Volvemos a "RestoAdmin"
                document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    };

    const MethodButton = ({ method, icon: Icon, label }) => (
        <button type="button" onClick={() => setPaymentMethod(method)}
            className={`flex-1 py-3 px-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                paymentMethod === method ? 'border-primary bg-indigo-50 text-primary font-bold' : 'border-gray-200 bg-white text-gray-500'
            }`}>
            <Icon size={24} /><span className="text-xs">{label}</span>
        </button>
    );

    // --- VISTA DE ÉXITO (TICKET) ---
    if (generatedInvoice) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Factura Emitida">
                <div className="flex flex-col items-center space-y-6">
                    <div className="text-center">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-2"/>
                        <h3 className="text-lg font-bold text-green-700">¡Listo!</h3>
                    </div>

                    {/* PREVISUALIZACIÓN DEL TICKET */}
                    <div id="modal-ticket-preview" className="bg-white border shadow-sm p-1 rounded max-h-[60vh] overflow-y-auto">
                        <InvoiceTicket invoice={generatedInvoice} />
                    </div>

                    <div className="flex gap-3 w-full">
                        <button onClick={handlePrint} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700 flex justify-center gap-2">
                            <Printer size={20}/> Imprimir
                        </button>
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    // --- VISTA DE FORMULARIO (TU DISEÑO) ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Emitir Factura">
            <form onSubmit={handleCheckout} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Método de Pago</label>
                    <div className="flex gap-3">
                        <MethodButton method="EFECTIVO" icon={Banknote} label="Efectivo" />
                        <MethodButton method="QR" icon={QrCode} label="QR Simple" />
                        <MethodButton method="TARJETA" icon={CreditCard} label="Tarjeta" />
                    </div>
                </div>
                {/* ... (Resto de tus inputs NIT/Nombre igual que antes) ... */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">NIT / CI</label>
                        <div className="relative">
                            <input type="number" placeholder="0" className="w-full p-3 pl-10 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none"
                                value={clientData.nit} onChange={e => setClientData({...clientData, nit: e.target.value})} />
                            <span className="absolute left-3 top-3.5 text-gray-400 font-bold">#</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social</label>
                        <div className="relative">
                            <input type="text" placeholder="SIN NOMBRE" className="w-full p-3 pl-10 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary outline-none uppercase"
                                value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} />
                            <User className="absolute left-3 top-3.5 text-gray-400 w-5 h-5"/>
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : <CheckCircle />} Cobrar
                </button>
            </form>
        </Modal>
    );
};

export default CheckoutModal;