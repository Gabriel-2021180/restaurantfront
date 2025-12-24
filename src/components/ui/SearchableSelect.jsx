import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder = "Seleccionar...", label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Encontrar el objeto seleccionado basado en el ID (value)
  const selectedOption = options.find(opt => opt.id === value);

  // Filtrar opciones basado en lo que escribe el usuario
  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cerrar el menú si hacen click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      
      {/* EL BOTÓN QUE ABRE EL MENÚ */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border ${isOpen ? 'border-primary ring-2 ring-indigo-100' : 'border-gray-200 dark:border-gray-700'} rounded-xl flex justify-between items-center cursor-pointer transition-all`}
      >
        <span className={selectedOption ? 'text-gray-800 dark:text-white' : 'text-gray-400'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* EL MENÚ DESPLEGABLE */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-fade-in-up">
          
          {/* Buscador interno */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-2 text-gray-400 w-4 h-4" />
              <input 
                autoFocus
                type="text" 
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 rounded-lg focus:outline-none dark:text-white"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de opciones */}
          <ul className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <li 
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id); // Devolvemos el ID al padre
                    setIsOpen(false);
                    setSearchTerm(''); // Limpiar busqueda
                  }}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-700 flex justify-between items-center ${value === opt.id ? 'bg-indigo-50 dark:bg-gray-700 text-primary font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {opt.name}
                  {value === opt.id && <Check size={14} className="text-primary" />}
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-400 text-center italic">
                No encontrado
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;