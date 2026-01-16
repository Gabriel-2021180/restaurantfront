import { useState, useEffect, useContext, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { SocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // <--- IMPORTAR
import toast, { Toaster } from 'react-hot-toast'; 

const NotificationBell = () => {
  const { socket } = useContext(SocketContext);
  const { user } = useAuth();
  const navigate = useNavigate(); // <--- HOOK DE NAVEGACIÓN
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
        // Reproducir sonido
        const audio = new Audio('/notification.mp3'); 
        audio.play().catch(() => {});

        // Toast flotante interactivo
        toast((t) => (
            <div 
                onClick={() => { 
                    if(notif.actionUrl) navigate(notif.actionUrl); 
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

        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket, navigate]);

  // Manejar clic en una notificación de la lista
  const handleNotificationClick = (notif) => {
      if (notif.actionUrl) {
          navigate(notif.actionUrl); // <--- TE LLEVA A LA PÁGINA
          setIsOpen(false); // Cierra el menú
      }
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
                {unreadCount > 0 && (
                    <button onClick={() => setUnreadCount(0)} className="text-xs text-primary font-bold hover:underline">
                        Marcar leídas
                    </button>
                )}
            </div>
            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        No tienes notificaciones nuevas.
                    </div>
                ) : (
                    notifications.map((notif, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition flex gap-3 cursor-pointer ${idx < unreadCount ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                            <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${notif.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
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