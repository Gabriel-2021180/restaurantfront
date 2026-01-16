import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, CalendarOff } from 'lucide-react';

const ModernSelect = ({ options, value, onChange, placeholder = "Seleccionar", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
            flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all w-full min-w-[140px]
            ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary cursor-pointer shadow-sm'}
            ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}
        `}
      >
        <span className={`font-bold text-sm ${selectedOption ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-up max-h-60 overflow-y-auto custom-scrollbar">
            {options.length > 0 ? (
                options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => {
                            if (!opt.disabled) {
                                onChange(opt.value);
                                setIsOpen(false);
                            }
                        }}
                        disabled={opt.disabled}
                        className={`
                            w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between transition-colors
                            ${opt.disabled 
                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50' 
                                : 'hover:bg-indigo-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-200'
                            }
                            ${value === opt.value ? 'bg-indigo-50 dark:bg-gray-700 text-primary dark:text-white' : ''}
                        `}
                    >
                        {opt.label}
                        {value === opt.value && <Check size={14} className="text-primary"/>}
                    </button>
                ))
            ) : (
                <div className="p-3 text-center text-xs text-gray-400 flex flex-col items-center">
                    <CalendarOff size={16} className="mb-1 opacity-50"/>
                    Sin datos
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ModernSelect;