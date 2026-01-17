import { useState, useEffect, useContext, useRef } from 'react';
import { Bell, Trash2 } from 'lucide-react'; // Agregué Trash2 por si quieren limpiar todo
import { SocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast'; 

const NotificationBell = () => {
  const { socket } = useContext(SocketContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 1. ESCUCHAR SOCKET
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
        // Reproducir sonido
        const audio = new Audio('/notification.mp3'); 
        audio.play().catch(() => {});

        // Toast flotante (Desaparece solo a los 5 segundos)
        toast((t) => (
            <div 
                onClick={() => { 
                    handleAction(notif); // <--- Lógica unificada
                    toast.dismiss(t.id);
                }}
                className="cursor-pointer flex flex-col"
            >
                <span className="font-bold">{notif.title}</span>
                <span className="text-sm">{notif.message}</span>
            </div>
        ), {
            icon: notif.type === 'success' ? '💰' : notif.type === 'error' ? '⚠️' : '🔔',
            duration: 5000, 
            position: 'top-right',
            style: { cursor: 'pointer' }
        });

        // Agregar a la lista con ID único (usamos timestamp si no viene id)
        const newNotif = { ...notif, id: notif.id || Date.now() };
        
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket, navigate]);

  // 2. AUTOLIMPIEZA (Cada minuto revisa si hay notificaciones viejas > 5 min)
  useEffect(() => {
      const interval = setInterval(() => {
          const now = Date.now();
          setNotifications(prev => {
              // Filtramos las que tengan menos de 5 minutos (300,000 ms)
              const freshOnes = prev.filter(n => (now - new Date(n.timestamp).getTime()) < 300000);
              
              // Si se borraron algunas, ajustamos el contador de no leídas
              if (freshOnes.length < prev.length) {
                  const diff = prev.length - freshOnes.length;
                  setUnreadCount(c => Math.max(0, c - diff));
              }
              return freshOnes;
          });
      }, 60000); // Ejecutar cada 60 segundos

      return () => clearInterval(interval);
  }, []);

  // 3. ACCIÓN AL HACER CLIC
  const handleAction = (notif) => {
      // Navegar si tiene link
      if (notif.actionUrl) {
          navigate(notif.actionUrl);
      }
      // BORRAR la notificación de la lista al hacer clic (para que no estorbe)
      removeNotification(notif.id);
      setIsOpen(false);
  };

  const removeNotification = (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
      const handleClickOutside = (event) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
              setIsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Toaster />
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-dark-card"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fade-in-up">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-white">Notificaciones</h3>
                {notifications.length > 0 && (
                    <button onClick={() => { setNotifications([]); setUnreadCount(0); }} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                        <Trash2 size={12}/> Limpiar todo
                    </button>
                )}
            </div>
            
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        Todo tranquilo por aquí.
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div 
                            key={notif.id} 
                            onClick={() => handleAction(notif)} // Al hacer clic, navega y se borra
                            className="p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex gap-3 cursor-pointer group"
                        >
                            <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-gray-400">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                                    <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">Ir ahora →</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;