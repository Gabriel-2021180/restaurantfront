import React, { useState, useEffect, useContext, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { SocketContext } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';

const NotificationBell = () => {
    const { socket } = useContext(SocketContext);
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const bellRef = useRef(null);

    // 1. Cargar Historial al iniciar
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                if (user) {
                    const data = await userService.getNotifications();
                    setNotifications(data);
                    setUnreadCount(data.filter(n => !n.is_read).length);
                }
            } catch (error) {
                console.error("Error cargando notificaciones", error);
            }
        };
        fetchHistory();
    }, [user]);

    // 2. Escuchar en vivo (Socket)
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (newNotif) => {
            // Filtro de Rol: Si la notificación es para 'admin' y yo soy 'waiter', la ignoro.
            if (newNotif.target_role && user.role?.slug !== 'super-admin' && user.role?.slug !== newNotif.target_role) {
                return;
            }

            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Sonido opcional
            const audio = new Audio('/assets/sounds/bell.mp3'); // Asegúrate de tener el archivo o comenta esta línea
            audio.play().catch(() => {}); 
        };

        socket.on('notification', handleNewNotification);

        return () => socket.off('notification', handleNewNotification);
    }, [socket, user]);

    // 3. Manejar Click: Redirigir y Marcar Leído
    const handleNotificationClick = async (notif) => {
        if (!notif.is_read) {
            markAsRead(notif.id);
        }
        setIsOpen(false);
        
        if (notif.target_url) {
            navigate(notif.target_url);
        }
    };

    const markAsRead = async (id) => {
        try {
            await userService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error(error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await userService.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {}
    };

    return (
        <div className="relative" ref={bellRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 relative hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <Bell size={20} className={`text-gray-600 dark:text-gray-300 ${unreadCount > 0 ? 'animate-pulse text-indigo-600 dark:text-indigo-400' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-dark-card">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl z-50 overflow-hidden">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                Marcar todo leído
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`
                                        p-4 border-b dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 group
                                        ${!notif.is_read ? 'bg-indigo-50/40 dark:bg-indigo-900/10 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}
                                    `}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <h4 className={`text-sm ${!notif.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                                                {notif.title}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] text-gray-400">
                                                    {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ahora'}
                                                </span>
                                                {notif.target_url && (
                                                    <span className="flex items-center text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                                        Ver <ExternalLink size={10} className="ml-1"/>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {!notif.is_read && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400"
                                                title="Marcar leído"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
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