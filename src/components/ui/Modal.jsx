import { X } from 'lucide-react';
import { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      {/* CAMBIOS CLAVE AQUÍ:
         1. max-h-[90vh]: La altura máxima será el 90% de la pantalla.
         2. flex flex-col: Para organizar Cabecera (fija) y Cuerpo (scroll).
      */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] transform transition-all scale-100">
        
        {/* Header (Se queda FIJO arriba) */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition">
            <X size={20} />
          </button>
        </div>

        {/* Body (Hace SCROLL si el contenido es largo) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;